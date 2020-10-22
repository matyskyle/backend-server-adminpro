var express = require('express');
const hospital = require('../models/hospital');
var app = express();

var Hospital = require('../models/hospital');
var Medico = require('../models/medico');
var Usuario = require('../models/usuario');

// ==========================================
// Busqueda por nodo
// ==========================================
app.get('/coleccion/:tabla/:busqueda', (req, res) => {
    var busqueda = req.params.busqueda;
    var tabla = req.params.tabla;
    var regex = new RegExp(busqueda, 'i')

    var promesa;

    switch( tabla ){
        case 'usuario':
            promesa = buscarUsuarios(busqueda, regex);
            break;
        case 'hospital':
            promesa = buscarHospitales(busqueda, regex);
            break;
        case 'medico':
            promesa = buscarMedicos(busqueda, regex);
            break;
        default:
            return res.status(400).json({
                ok: false,
                mensaje: 'Error en la busqueda!',
                error: {mensaje: 'Tipo de tabla/coleccion no valido'}
            });
    }

    promesa.then( data => {
        res.status(200).json({
            ok: true,
            [tabla]: data
        });
    });
});


// ==========================================
// Busqueda general
// ==========================================
app.get('/todo/:busqueda',(req, res, next) => {

    var busqueda = req.params.busqueda;
    //se crea una expresion regular para realizar la busqueda
    var regex = new RegExp(busqueda, 'i');

    Promise.all([
        buscarHospitales( busqueda, regex ),
        buscarMedicos( busqueda, regex ),
        buscarUsuarios( busqueda, regex )
    ]).then( respuestas => {
        res.status(200).json({
            ok: true,
            hospital: respuestas[0],
            medico: respuestas[1],
            usuario: respuestas[2]
        });
    });
});

function buscarHospitales( busqueda, regex ) {

    return new Promise( ( resolve, reject ) => {
        Hospital.find({ nombre: regex }).populate('usuario', 'nombre email')
        .exec(( err, hospital ) => {
            if ( err ) {
                reject( 'Error al buscar hospitales. ',err);
            }else{
                resolve(hospital);
            }
        });
    });
}

function buscarMedicos( busqueda, regex ) {

    return new Promise( ( resolve, reject ) => {
        Medico.find({ nombre: regex }).populate('usuario', 'nombre email')
        .populate('hospital', 'nombre').exec(( err, medico ) => {
            if ( err ) {
                reject( 'Error al buscar medicos. ',err);
            }else{
                resolve(medico);
            }
        });
    });
}

function buscarUsuarios( busqueda, regex ) {

    return new Promise( ( resolve, reject ) => {
        Usuario.find({}, 'nombre email role').or([ {nombre: regex}, {'email': regex} ])
        .exec( (err, usuario) => {
            if (err) {
                reject('Error al cargar usuarios. ', err);
            }else{
                resolve(usuario);
            }
        });
    });
}

module.exports = app;