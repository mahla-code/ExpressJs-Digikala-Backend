const {Router} = require("express");
const {createProductValidation} = require("./validation");
const {createProductHandler, getProductsHandler, getProductDetailByIdHandler, removeProductHandler} = require("./product.service");
const AuthGuard = require("../auth/auth.guard");
const router = Router();
router.post("/",AuthGuard, createProductValidation, createProductHandler);
router.get("/", getProductsHandler);
router.get("/:id", getProductDetailByIdHandler);
router.delete("/:id",AuthGuard, removeProductHandler);

module.exports = {
    productRoutes: router
};