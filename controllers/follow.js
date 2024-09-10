//Importar modelo
const Follow = require("../models/follow");
const User = require("../models/user");

//Importar servicio
const followService = require("../services/followService");

const mongoosePagination = require("mongoose-pagination");

//Acciones de prueba
const pruebaFollow = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/follow.js"
    })
}

//Accion de guardar un follow
const save = (req, res) => {
    //Conseguir datos por body
    const params = req.body;
    //Sacar id del usuario identificado
    const identity = req.user;
    //Crear objeto con modelo follow
    let userToFollow = new Follow({
        user: identity.id,
        followed: params.followed
    });

    //Guardar objeto en bbdd
    userToFollow.save().then((followStored) => {
        if (!followStored) {
            return res.status(500).send({
                status: "error",
                message: "No se ha podido seguir al usuario"
            })
        }

        return res.status(200).send({
            status: "Success",
            identity: req.user,
            follow: followStored
        });
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta"
        })
    });


}
//Accion de borrar un follow
const unfollow = (req, res) => {
    //Recoger el id del usuario identificado
    const userId = req.user.id;

    //recoger el id del usuario que quiero dejar de seguir
    const followedId = req.params.id;
    //find de las coincidencias y hacer remove
    Follow.deleteOne({
        "user": userId,
        "followed": followedId
    }).then((followDelete) => {
        if (!followDelete) return res.status(500).send({ status: "error", message: "No se pudo dejar de seguir" });
        return res.status(200).send({
            status: "Success",
            message: "Follow eliminado correctamente"
        });
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta"
        })
    });
}

//Accion listado de following
const following = (req, res) => {
    //Scar el id del usuario identificado
    let userId = req.user.id;

    //Comprobar si me llega el id por parametro en la url
    if (req.params.id) userId = req.params.id;

    //Comproboar si me llega la pagina
    let page = 1;
    if (req.params.page) page = req.params.page;

    //Cuantos usuarios por pagina
    const itemsPerPage = 1;

    //find a follows, popular datos de los usuarios y paginar con mongoose paginate
    Follow.find({ user: userId }).sort('_id').paginate(page, itemsPerPage)
        .populate("user followed", "-password -role -__v -email").then(async (follows) => {
            let auxTotal = await Follow.countDocuments();

            //Listado de usuarios de trinity, y yo victor

            //Sacar un array de ids de los usuarios que me siguen y los que sigo como victor
            let followUserIds = await followService.followUserIds(req.user.id);

            return res.status(200).send({
                status: "success",
                message: "Listado que estoy siguiendow",
                follows,
                total: auxTotal,
                pages: Math.ceil(auxTotal / itemsPerPage),
                user_followin: followUserIds.following,
                user_follow_me: followUserIds.followers
            });
        }).catch((error) => {
            return res.status(500).send({
                stauts: "error",
                message: "Error de consulta"
            })
        });
}
//Accion listado de followers
const followers = (req, res) => {
    //Scar el id del usuario identificado
    let userId = req.user.id;

    //Comprobar si me llega el id por parametro en la url
    if (req.params.id) userId = req.params.id;

    //Comproboar si me llega la pagina
    let page = 1;
    if (req.params.page) page = req.params.page;

    //Cuantos usuarios por pagina
    const itemsPerPage = 1;



    //find a follows, popular datos de los usuarios y paginar con mongoose paginate
    Follow.find({ followed: userId }).sort('_id').paginate(page, itemsPerPage)
        .populate("user", "-password -role -__v -email").then(async (follows) => {
            let auxTotal = await Follow.countDocuments();

            let followUserIds = await followService.followUserIds(req.user.id);

            return res.status(200).send({
                status: "success",
                message: "Listado que me siguien",
                follows,
                total: auxTotal,
                pages: Math.ceil(auxTotal / itemsPerPage),
                user_followin: followUserIds.following,
                user_follow_me: followUserIds.followers
            });
        }).catch((error) => {
            return res.status(500).send({
                stauts: "error",
                message: "Error de consulta"
            })
        });
}


//Exportar acciones
module.exports = {
    pruebaFollow,
    save,
    unfollow,
    following,
    followers
}