//Importar dependecias y modulos
const bcrypt = require("bcrypt");
const mongoosePagination = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");
//Importar modelo
const User = require("../models/user");
const Follow = require("../models/follow");
const Publicacion = require("../models/publication");

//Importar servicios
const jwt = require("../services/jwt");
const followService = require("../services/followService");

//Acciones de prueba
const pruebaUser = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/user.js",
        usuario: req.user
    });
}

//Registro de usuarios
const register = (req, res) => {
    //Obtener los datos
    let params = req.body;

    //Comprobador que llegan los datos bien
    if (!params.name || !params.email || !params.password || !params.nick) {
        return res.status(400).json({
            message: "Faltan datos por enviar",
            status: "error"
        })
    }

    //Control de usuarios duplicados
    User.find({
        $or: [
            { email: params.email.toLowerCase() },
            { nick: params.nick.toLowerCase() }
        ]
    }).then(async (users) => {
        if (users && users.length >= 1) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
        }
        //Cifrar la contraseña
        params.password = await bcrypt.hash(params.password, 10);

        //Crear un objeto de usuario
        let user_to_save = new User(params);

        //Guardar usuario en la bbdd
        user_to_save.save().then((userStored) => {
            //Devolver resultado
            return res.status(200).json({
                status: "success",
                message: "Accion de registro de usuarios",
                user: userStored
            });
        }).catch((error) => {
            return res.status(500).json({ status: "error", message: "error en al consulta de usuarios" });
        });
    });
}

const login = (req, res) => {
    //Obtener parametros body
    let params = req.body;
    if (!params.email || !params.password) {
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        });
    }
    //Buscar en la bbdd si existe
    User.findOne({ email: params.email })
        //.select({"password":0})
        .then((user) => {
            if (!user) return res.status(404).send({ status: "Error", message: "No existe el usuario" });
            //Comprobar su contraseña
            const pwd = bcrypt.compareSync(params.password, user.password)
            if (!pwd) {
                return res.status(400).send({
                    status: "Error",
                    message: "No te has identificado correctamente"
                })
            }
            //Devolver token
            const token = jwt.createToken(user);
            console.log(jwt.secret);

            //Devolver datos del usuario
            return res.status(200).send({
                status: "success",
                message: "Te has identificado correctamente",
                user: {
                    id: user._id,
                    name: user.name,
                    nick: user.nick
                },
                token
            })
        }).catch((error) => {
            return res.status(500).send({
                status: "Error",
                message: "Error de conexión",
                fail: error
            });
        });

}

const profile = (req, res) => {
    //Recibir el parametro del id del usuario por la url
    const id = req.params.id;
    //Consulta para obtener los datos del usuario
    User.findById(id).select({ password: 0, role: 0 }).then(async (userProfile) => {
        if (!userProfile) return res.status(404).send({ status: "error", message: "No es posible encontrar el usuario" });

        //Info de seguimiento
        const followInfo = await followService.followThisUser(req.user.id, id);

        //Devolver el resultado
        return res.status(200).send({
            status: "success",
            user: userProfile,
            following: followInfo.following,
            follower: followInfo.follower
        });
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "No es posible encontrar el usuario"
        })
    });
}

const list = (req, res) => {
    //Controlar la pagina
    let page = 1;
    if (req.params.page) {
        page = req.params.page;
    }
    page = parseInt(page);
    //Consultar con mongoose paginate
    let itemsPerPage = 1;
    User.find().select("-password -email -role -__v").sort('_id').paginate(page, itemsPerPage).then(async (users) => {
        if (!users) return res.status(404).send({ status: "error", message: "No hay usuarios disponibles" });
        //Devolver el resultado (posteriormente follows)
        let total = await User.countDocuments();
        //Sacar un array de ids de los usuarios que me siguen y los que sigo como victor
        let followUserIds = await followService.followUserIds(req.user.id);

        return res.status(200).send({
            status: "success",
            users,
            page,
            itemsPerPage,
            total: total,
            pages: Math.ceil(total / itemsPerPage),
            user_followin: followUserIds.following,
            user_follow_me: followUserIds.followers
        });

    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta",
            error
        });
    });
}

const update = (req, res) => {
    //Recoger info del usuario a actualizar
    let userIdentity = req.user;
    let userToUpdate = req.body;

    //ELiminar campos sobrantes
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;
    //Comprobar si el usuario ya exite
    User.find({
        $or: [
            { email: userToUpdate.email.toLowerCase() },
            { nick: userToUpdate.nick.toLowerCase() }
        ]
    }).then(async (users) => {
        let userIsset = false;
        users.forEach(user => {
            if (user && user._id != userIdentity.id) userIsset = true;
        });

        if (userIsset) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
        }
        //Cifrar la contraseña
        if (userToUpdate.password)
            userToUpdate.password = await bcrypt.hash(userToUpdate.password, 10);
        else
            delete userToUpdate.password

        //Buscar y actualizar el usuario con la nueva informacion
        User.findByIdAndUpdate({ _id: userIdentity.id }, userToUpdate, { new: true }).then(async (userUpdate) => {
            if (!userUpdate) {
                return res.status(500).send({
                    status: "success",
                    message: "Error al actualizar el usuario",
                });
            }
            return res.status(200).send({
                status: "success",
                message: "Metodo de actualizar usuario",
                user: userUpdate
            });
        }).catch((error) => {
            return res.status(500).send({
                status: "Error",
                message: "Error en la consulta"
            })
        });


    }).catch((error) => {
        return res.status(500).send({
            status: "Error",
            message: "Error en la consulta"
        })
    });
}

const upload = (req, res) => {
    //Recoger el fichero y comprobar existencia de la imagen
    if (!req.file) {
        return res.status(404).send({
            status: "error",
            message: "Peticion no incluye la imagen"
        });
    }
    //Conseguir el nombre del archivo
    let image = req.file.originalname;
    //Sacar la extension del archivo
    const imageSplit = image.split('.');
    const extension = imageSplit[1];
    //Comprobar extension
    if (extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif") {
        //Borrar archivo
        const filePath = req.file.path;
        const fileDeleted = fs.unlinkSync(filePath);
        //Devolver respuesta negativa
        return res.status(400).send({
            status: "Error",
            message: "Extension del fichero invalida"
        });
    }

    //si es correcto, guardar imagen en bbdd
    User.findOneAndUpdate({ _id: req.user.id }, { image: req.file.filename }, { new: true }).then((userUpdate) => {
        if (!userUpdate) { return res.status(500).send({ status: "error", message: "Error al subir el avatar" }) }
        //Devolver respuesta 
        return res.status(200).send({
            status: "success",
            user: userUpdate,
            file: req.file
        });
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta",
            error
        })
    })
}

const avatar = (req, res) => {
    //Scar el parametro de la url
    const file = req.params.file;


    //Montar el path real de la imagen
    const filePath = "./uploads/avatars/" + file;
    //Comprobar que el archivo existe
    fs.stat(filePath, (error, exists) => {
        if (!exists) return res.status(404).send({ status: "error", message: "No existe la imagen" });
        //Devolver un file
        return res.sendFile(path.resolve(filePath));
    })

    /* fs.stat(filePath).then((exists) =>{
        if(!exists) return res.status(400).send({status: "error", message: "No existe la imagen"});
        //Devolver un file
        return res.sendFile(path.resolve(filePath));
    }).catch((error) =>{
        return res.status(500).send({
            status: "error",
            message: "Error de consulta"
        })
    }) */
}

const counters = async (req, res) => {
    let userId = req.user.id;
    if (req.params.id) {
        userId = req.params.id;
    }
    try {
        const myFollows = await followService.followUserIds(req.user.id);
        const publications = await Publication.find({ "user": userId });
        /*const following = await Follow.count({ "user": userId });     
            const followed = await Follow.count({ "followed": userId });     
                const publications = await Publication.count({ "user": userId });*/
        return res.status(200).send({
            userId,
            following: myFollows.following.length,
            followed: myFollows.followers.length,
            publications: publications.length
        });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error en los contadores", error
        });
    }
}

/* const counters = async (req, res) => {
    let userId = req.user.id;
    if (req.params.id) {
        userId = req.params.id;
    }

    let following;
    Follow.count({ "user": userId }).then((following) => {
        following = following;
    }).catch((error) => {
        console.log(error);
    });

    let followed;
    Follow.count({ "user": userId }).then((followed) => {
        followed = followed;
    }).catch((error) => {
        console.log(error);
    });

    let publications;
    Follow.count({ "user": userId }).then((publications) => {
        publications = publications;
    }).catch((error) => {
        console.log(error);
    });

    return res.status(200).send({
        userId,
        following: following,
        followed: followed,
        publications: publications
    });


    /* try{
        const following = await Follow.count({"user" : userId});
        const followed = await Follow.count({"followed" : userId});
        const publications = await Publication.count({"user" : userId});
        return res.status(200).send({
            userId,
            following: following,
            followed: followed,
            publications: publications
        });
    }catch(error){
        return res.status(500).send({
            status: "error",
            message: "Error de consulta"
        });
    }ß

} */

//Exportar acciones
module.exports = {
    pruebaUser,
    register,
    login,
    profile,
    list,
    update,
    upload,
    avatar,
    counters
}