const createHttpError = require("http-errors");
const {Role, Permission, RolePermission} = require("./rbac.model");
const {Op} = require("sequelize");

async function createRoleHandler (req, res, next) {
    try {
        const {title, description} = req.body; //Admin, Accountant, Support, Support-2
        const existRole = await Role.findOne({where: {title}});
        if (existRole) throw createHttpError(409, "role title already exist");
        await Role.create({
            title,
            description
        });
        return res.json({
            message: "role created successfully"
        });
    } catch (error) {
        next(error);
    }
}
async function createPermissionHandler (req, res, next) {
    try {
        const {title, description} = req.body;
        const existPermission = await Permission.findOne({where: {title}});
        if (existPermission) throw createHttpError(409, "permission title already exist ");
        await Permission.create({
            title,
            description
        });
        return res.json({
            message: "permission created successfully"
        });
    } catch (error) {
        next(error);
    }
}
async function assignPermissionToRoleHandler (req, res, next) {
    try {
        let {roleId, permissions = []} = req.body;
        const role = await Role.findOne({where: {id: roleId}});
        if (!role) throw createHttpError(404, "role not found");
        if (permissions?.length > 0) {
            const permissionCount = await Permission.count({where: {id: {[Op.in]: permissions}}});
            if (permissionCount !== permissions.length) {
                throw createHttpError(400, "please send valid list of permissions");
            }
            const permissionList = permissions.map(per => ({
                roleId,
                permissionId: per
            }));
            await RolePermission.bulkCreate(permissionList);
        }
        return res.json({
            message: "permissions assigned to role successfully"
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    createRoleHandler,
    createPermissionHandler,
    assignPermissionToRoleHandler
};