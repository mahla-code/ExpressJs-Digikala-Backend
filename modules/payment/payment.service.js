const createHttpError = require("http-errors");
const {OrderStatus} = require("../../common/constant/order.const");
const {getUserBasketById} = require("../basket/basket.service");
const {Order, OrderItems} = require("../order/order.model");
const {zarinpalRequest, zarinpalVerify} = require("../services/zarinpal.service");
const {Payment} = require("./payment.model");
const {Basket} = require("../basket/basket.model");
const sequelize = require("../../config/sequelize.config");
const {Product, ProductColor, ProductSize} = require("../product/product.model");
async function paymentBasketHandler (req, res, next) {
    try {
        const {id: userId} = req.user;
        const {basket, totalAmount, finalAmount, totalDiscount} = await getUserBasketById(userId);
        const payment=await sequelize.transaction(async(t)=>{
            const payment = await Payment.create({
                userId,
                amount: finalAmount,
                status: false,
            },{transaction:t});
            const order = await Order.create({
                userId,
                paymentId: payment.id,
                total_amount: totalAmount,
                final_amount: finalAmount,
                discount_amount: totalDiscount,
                status: OrderStatus.Pending,
                address: "Iran-Tehran",
            },{transaction:t});
            payment.orderId = order.id;
            await payment.save({transaction:t})
            let orderList = [];
            for (const item of basket) {
                let items = [];
                if (item?.sizes?.length > 0) {
                    items = item?.sizes.map(size => {
                        return {
                            orderId: order.id,
                            productId: item?.id,
                            sizeId: size?.id,
                            count: size?.count
                        };
                    });
                } else if (item?.colors?.length > 0) {
                    items = item?.colors.map(color => {
                        return {
                            orderId: order.id,
                            productId: item?.id,
                            colorId: color?.id,
                            count: color?.count
                        };
                    });
                } else {
                    items = [
                        {
                            orderId: order.id,
                            productId: item?.id,
                            count: item?.count,
                        }
                    ];
                }
                orderList.push(...items);
            }
            await OrderItems.bulkCreate(orderList,{transaction:t});
            return payment
        })
        const result = await zarinpalRequest(payment?.amount, req?.user);
        payment.authority = result?.authority;
        await payment.save();
        return res.json(result);
    } catch (error) {
        next(error);
    }
}
async function paymentVerifyHandler (req, res, next) {
    try {
        const {Authority, Status} = req?.query;
        console.log(req?.query);
        // status: OK , NOK
        if (Status === "OK" && Authority) {
            const payment = await Payment.findOne({where: {authority: Authority}});
            if (!payment) throw createHttpError(404, "payment not found");
            const result = await zarinpalVerify(payment?.amount, payment?.authority);
            if (result) {
                const order = await Order.findByPk(payment.orderId);
                if (!order) throw createHttpError(404, "order not found");
                await sequelize.transaction(async (t) => {
                    payment.status = true;
                    payment.refId = result?.ref_id;
                    await payment.save({transaction: t});
                    order.status = OrderStatus.InProcess;
                    await order.save({transaction: t});
                    const items = await OrderItems.findAll({where: {orderId: order.id}, transaction: t});
                    for (const item of items) {
                    if (item.sizeId) {
                            await ProductSize.decrement("count", {by: item.count, where: {id: item.sizeId}, transaction: t});
                        } else if (item.colorId) {
                            await ProductColor.decrement("count", {by: item.count, where: {id: item.colorId}, transaction: t});
                        } else {
                            await Product.decrement("count", {by: item.count, where: {id: item.productId}, transaction: t});
                        }
                    }
                    await Basket.destroy({where: {userId: order.userId}, transaction: t});
                });
                return res.redirect("http://frontenddomain.com/payment?status=success");
            } else {
             await Payment.destroy({where: {id: payment?.id}});
             await Order.destroy({where: {id: payment?.orderId}});
            }
        }
        return res.redirect("https://frontenddomain.com/payment?status=failure");
    } catch (error) {
        res.redirect("https://frontenddomain.com/payment?status=failure");
    }
}
module.exports = {
    paymentBasketHandler,
    paymentVerifyHandler
};