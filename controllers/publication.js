//Importar modulos
const fs = require("fs");
const path = require("path");
//Importar modelos
const Publication = require("../models/publication");

//Importar servicios
const followService = require("../services/followService");

//Acciones de prueba
const pruebaPublication = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/Publication.js"
    })
}

//Guardar publicacion
const save = (req, res) => {
    //Recoger datos del body
    const params = req.body;
    //Si no llegan dar negativa
    if (!params.text) return res.status(400).send({ status: "error", message: "Debes enviar el texto de la publicacion" });
    //Crear y rellenar el objeto
    let newPublication = new Publication(params);
    newPublication.user = req.user.id;
    //Guardar el objeto en bbdd
    newPublication.save().then((publicationStored) => {
        if (!publicationStored) return res.status(400).send({ status: "error", message: "No se ha podido guardar la publicacion" });
        //Devolver la respuesta
        return res.status(200).send({
            status: "Success",
            message: "Publicacion guardada",
            publicationStored
        })
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "error en la consulta"
        })
    });
}

//Mostrar una publicacion
const detail = (req, res) => {
    //Sacar el id de la publicacion
    let publicationId = req.params.id;
    //Find con la condicion del id
    Publication.findById(publicationId).then((publicationStored) => {
        if (!publicationStored) return res.status(404).send({ status: "error", message: "No se encontro esa publicacion" });

        //Devolver una respuesta
        return res.status(200).send({
            status: "success",
            message: "Mostrar detalle",
            publicationStored
        });

    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta"
        });
    });

}

//Eliminar publicaciones
const remove = (req, res) => {
    //Sacar el di de la publicacion
    const publicationId = req.params.id;
    //Find and remove
    Publication.deleteOne({ "user": req.user.id, "_id": publicationId }).then((publicationDelete) => {
        if (!publicationDelete) return res.status(500).send({ status: "error", message: "No se pudo eliminar la publicacion" });
        //Devolver la respuesta
        return res.status(200).send({
            status: "success",
            message: "Eliminar publicacion",
            //publicationDelete
            publication: publicationId
        });
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta"
        })
    })

}
//Listar publicaciones de un usuario
const user = (req, res) => {
    //Sacar el id del usuario
    const userId = req.params.id;
    //Controlar la pagina
    let page = 1;
    if (req.params.page) page = req.params.page;
    const itemsPerPage = 4;

    //Find, populate, ordenar, paginar
    Publication.find({ "user": userId }).sort("-created_at")
        .populate('user', '-password --v -role -email')
        .paginate(page, itemsPerPage)
        .then(async (publications) => {
            if (!publications) return res.status(404).send({ stauts: "error", message: "No hay publicaciones" });
            let total = await Publication.countDocuments();
            //let total = publications.length;
            //console.log(publications.countDocuments());
            //Devolver respuesta
            return res.status(200).send({
                status: "success",
                message: "lista de publicaciones de un perfil",
                page,
                total,
                pages: Math.ceil(total / itemsPerPage),
                publications
            });
        }).catch((error) => {
            return res.status(500).send({ status: "error", message: "Error en la consulta" });
        });
}

//Sjubir ficheros
const upload = (req, res) => {
    //Sacar publication id
    const publicationId = req.params.id;
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
    Publication.findOneAndUpdate({ "user": req.user.id, "_id": publicationId }, { file: req.file.filename }, { new: true }).then((publicationUpdate) => {
        if (!publicationUpdate) { return res.status(500).send({ status: "error", message: "Error al subir el avatar" }) }
        //Devolver respuesta 
        return res.status(200).send({
            status: "success",
            publication: publicationUpdate,
            file: req.file
        });
    }).catch((error) => {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta",
        })
    })
}

//Devolver archivos multimedia
const media = (req, res) => {
    //Scar el parametro de la url
    const file = req.params.file;


    //Montar el path real de la imagen
    const filePath = "./uploads/publications/" + file;
    //Comprobar que el archivo existe
    fs.stat(filePath, (error, exists) => {
        if (!exists) return res.status(404).send({ status: "error", message: "No existe la imagen" });
        //Devolver un file
        return res.sendFile(path.resolve(filePath));
    });
}


//Listar todas las publicaciones
const feed = async (req, res) => {
    //Sacar la pagina
    let page = 1;
    if (req.params.page) page = req.params.page;
    //Establecer numero de elementos por pagina
    let itemsPerPage = 4;
    //Sacar un array de identificadores de usuarios que yo sigo como usuario identificado
    try {
        const myFollows = (await followService.followUserIds(req.user.id)).following;
        //find a pubnlicaciones in
        //let publications = await Publication.find({user: {"$in": myFollows}});
        Publication.find({user: myFollows})
        .populate("user", "-password -role -__v -email").sort("-created_at")
        .paginate(page, itemsPerPage).then( async (publications) =>{
            let total = await Publication.countDocuments();
            return res.status(200).send({
                status: "success",
                message: "Listado de publicaciones",
                myFollows,
                total,
                page,
                pages: Math.ceil(total/itemsPerPage),
                publications
            });
        });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "No se han actualizado el feed"
        });
    }

}





//Exportar acciones
module.exports = {
    pruebaPublication,
    save,
    detail,
    remove,
    user,
    upload,
    media,
    feed
}