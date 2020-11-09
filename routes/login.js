var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app = express();
var Usuario = require('../models/usuario');

//GOOGLE
var CLIENT_ID = require('../config/config').CLIENT_ID;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);


// ==========================================
// Autenticacion con Google
// ==========================================
async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];}
    return {
        nombre: payload.name,
        email: payload.email,
        img: payload.picture,
        google: true
    }
}

app.post('/google', async(req, res) => {

    var token = req.body.token;

    var googleUser = await verify(token).catch(e => {
        return res.status(403).json({
            ok: false,
            mensaje: 'Token no valido!'
        });
    });

    Usuario.findOne( {email: googleUser.email}, (err, usuario) => {

        if (err) {
            return res.status(500).json({
                ok: true,
                mensaje: 'Error al buscar usuario - login',
                errors: err
            });
        }

        if (usuario) {
            if (usuario.google === false) {
                return res.status(400).json({
                    ok: true,
                    mensaje: 'Debe de usar su autenticación normal'
                });
            } else {

                usuario.password = ':)';

                var token = jwt.sign({ usuario: usuario }, SEED, { expiresIn: 14400 }); // 4 horas

                res.status(200).json({
                    ok: true,
                    usuario: usuario,
                    token: token,
                    id: usuario._id,
                    menu: obtenerMenu( usuario.role )
                });
            }

            // Si el usuario no existe por correo
        } else {

            var usuario = new Usuario();

            usuario.nombre = payload.name;
            usuario.email = payload.email;
            usuario.password = ':)';
            usuario.img = payload.picture;
            usuario.google = true;

            usuario.save((err, usuarioDB) => {

                if (err) {
                    return res.status(500).json({
                        ok: true,
                        mensaje: 'Error al crear usuario - google',
                        errors: err
                    });
                }

                var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4 horas

                res.status(200).json({
                    ok: true,
                    usuario: usuarioDB,
                    token: token,
                    id: usuarioDB._id,
                    menu: obtenerMenu( usuarioDB.role )
                });
            });
        }
    });
});

// ==========================================
// Autenticacion normal
// ==========================================
app.post('/', (req, res) => {

    var body = req.body;

    Usuario.findOne({ email: body.email }, (err, usuarioDB) => {

        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }

        if (!usuarioDB) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });
        }

        if (!bcrypt.compareSync(body.contrasena, usuarioDB.contrasena)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - contrasena',
                errors: err
            });
        }

        // Crear un token!!!
        usuarioDB.contrasena = ':)';

        var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4 horas

        res.status(200).json({
            ok: true,
            usuario: usuarioDB,
            token: token,
            id: usuarioDB._id,
            menu: obtenerMenu( usuarioDB.role )
        });
    })
});

function obtenerMenu( ROLE ){

    var menu = [
        {
        titulo:'principal',
        icono:'mdi mdi-gauge',
        submenu:[
            {titulo: 'Dashboard', url: '/dashboard'},
            {titulo: 'ProgressBar', url: '/progress'},
            {titulo: 'Graficas', url: '/graficas1'},
            {titulo: 'Formulario', url: '/formulario'},
            {titulo: 'Promesas', url: '/promesas'},
            {titulo: 'Rxjs', url: '/rxjs'}
        ]
        },
        {
        titulo:'Mantenimientos',
        icono: 'mdi mdi-folder-lock-open',
        submenu: [
            // {titulo:'Usuarios', url: '/usuarios'},
            {titulo:'Medicos', url: '/medicos'},
            {titulo:'Hospitales', url: '/hospitales'},
        ]
        }
    ];

    if ( ROLE === 'ADMIN_ROLE') {
        menu[1].submenu.unshift( {titulo:'Usuarios', url: '/usuarios'} );
    }

    return menu;

}

module.exports = app;