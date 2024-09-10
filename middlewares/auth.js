//Importar modulos
const jwt = require("jwt-simple");
const moment = require("moment");
//Importar k
const libkwt = require("../services/jwt");
const secret = libkwt.secret;

//middleware de autenticacion
exports.auth = (req, res, next) => {
    //Comprobar si llega la cabcera de auth
    if (!req.headers.authorization) {
        return res.status(403).send({
            status: "error",
            message: "La peticion no tiene cabecera de autenticacion"
        });
    }
    //limpiar el token
    let token = req.headers.authorization.replace(/['"]+/g, '');

    //Decodificar el token
    try {
        let payload = jwt.decode(token, secret);
        
        //Comprobar expiracion del token
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({
                stauts: "error",
                message: "Token expirado"
            })
        }
        //Agregar datos de usuario a request
        req.user = payload;
    } catch (error) {
        return res.status(404).send({
            status: "error",
            message: "Token invalido",
            error
        })
    }


    //Pasar a ejecutar la accion
    next();
}
