/**
 *@NApiVersion 2.0
 *@NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/record', './libs/2WinArchivo-v2.0'],

    /**
     * Correspone a Nominas Banco de Chile
     * 
     * @param {runtime} runtime 
     * @param {search} search 
     * @param {record} record 
     * @param {file} file
     */
    function (runtime, search, record, archivo) {

        function getInputData() {

            // Se obtiene ID de Nomina creada.
            var idNomina = runtime.getCurrentScript().getParameter("custscript_2win_idnominapago_chile");
            log.debug("idNomina", idNomina);

            // Obtener registro nomina
            var nominaRecord = record.load({ type: 'customrecord_2w_nominas_pago', id: idNomina });

            // Obtener datos nomina
            var idSubsidiaria = nominaRecord.getValue("custrecord_2w_nompago_empresa");
            var cuentaBanco = nominaRecord.getValue("custrecord_2w_nompago_cuenta_banco");

            log.debug("getInputData", "idSubsidiaria: " + idSubsidiaria + " nroCuentaBanco: " + cuentaBanco);

            // Detalle de los Pagos
            var detallesPago = obtenerDetallesPago(idSubsidiaria, cuentaBanco);
            log.audit({
                title: 'DetallesPago',
                details: detallesPago
            })
            log.debug({ title: 'getInputData', details: detallesPago.length });

            return detallesPago;
        }

        function map(context) {
            // Se obtiene ID de Nomina creada.
            var idNomina = runtime.getCurrentScript().getParameter("custscript_2win_idnominapago_chile");
            log.debug("idNomina map", idNomina);

            // Se obtiene cada detalle de nomina
            var detalle = JSON.parse(context.value);
            log.audit({
                title: 'Detalle',
                details: detalle
            })

            // Se graba cada registro obtenido de detalle en la tabla Detalle Nómina de Pago
            var detalleNominaPago = record.create({
                type: 'customrecord_2w_detalle_nomina_pago',                  
            });

            detalleNominaPago.setValue({
                fieldId: 'custrecord_2w_detpago_nomina',
                value: idNomina
            });
            detalleNominaPago.setValue({
                fieldId: 'custrecord_2w_detpago_transaccion',
                value: detalle.internalid
            });
            detalleNominaPago.setValue({
                fieldId: 'custrecord_2w_detpago_monto_a_pagar',
                value: detalle.monto_documento
            });

            var detalleCreado = detalleNominaPago.save();


            // Se genera detalle para cada pago
            var detalleNomina = generarLineaDetallePago(detalle);
            log.audit({
                title: 'DetalleNomina',
                details: detalleNomina
            })
            context.write('detalleNomina', detalleNomina);
            
        }

        function summarize(summary) {

            var detalle = "";

            summary.output.iterator().each(function(key, value) {

                log.debug({  title: 'key ' + key, details: value });

                switch (key) {
                    case 'detalleNomina':
                        detalle += value;
                        break;
                }
                return true;
            });

            var contents = detalle;

            log.audit({
                title: 'Contents',
                details: contents
            })

            if (contents.length > 0) {

                log.audit({ title: 'summarize', details: detalle });

                var nombre_archivo = getNombreArchivo();
                var nombre_carpeta = 'pagos_masivos';
                var id_carpeta = archivo.getFolderIdByName(nombre_carpeta);
                var id_archivo = archivo.createFile(id_carpeta, nombre_archivo, archivo.type.CSV, contents);

                log.audit({ title: 'summarize', details: id_archivo });
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        }

        function generarLineaDetallePago(detalle) {

            var salto = String.fromCharCode(13) + String.fromCharCode(10);
            var puntoycomma = String.fromCharCode(59);

            // Inicio de linea detalle pago
            var linea = "";
            linea += detalle.relleno1 + puntoycomma;
            linea += detalle.rut + puntoycomma;
            linea += detalle.dv_rut + puntoycomma;
            linea += detalle.nombre_proveedor + puntoycomma;
            linea += detalle.tipo_documento + puntoycomma;
            linea += detalle.numero_documento + puntoycomma;
            linea += detalle.fecha_emision + puntoycomma;
            linea += detalle.monto_documento + puntoycomma;
            linea += detalle.observaciones + puntoycomma;
            linea += detalle.medio_pago + puntoycomma;
            linea += detalle.codigo_banco + puntoycomma;
            linea += detalle.numero_cuenta + puntoycomma;
            linea += detalle.tipo_aviso + puntoycomma;
            linea += detalle.email + puntoycomma;
            linea += detalle.relleno2;
            linea += salto;
            // Fin de linea detalle pago 

            return linea;
        }

        function obtenerDetallesPago(idSubsidiaria, cuentaBanco) {

            var searchResults = [];

            try {

                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                    [
                        ["type","anyof","VendPymt","TaxPymt"], 
                        "AND", 
                        ["approvalstatus","noneof","3"], 
                        "AND", 
                        ["custrecord_2w_detpago_transaccion.internalidnumber","isempty",""], 
                        "AND", 
                        ["status","noneof","VendPymt:E","VendPymt:A","VendPymt:D","VendPymt:V"], 
                        "AND", 
                        ["subsidiary","anyof",idSubsidiaria], 
                        "AND", 
                        ["account","anyof",cuentaBanco], 
                        "AND", 
                        ["vendor.custentity_2w_cuenta_prov_cli_empl","isnotempty",""], 
                        "AND", 
                        ["tobeprinted","is","F"]
                    ],
                    columns:
                    [
                       search.createColumn({
                          name: "formulatext",
                          formula: "'1'",
                          label: "Relleno1"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "SUBSTR(REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2wrut} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2wrut} ELSE ' ' END, '.', ''), '-', ''), 1, LENGTH(REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2wrut} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2wrut} ELSE ' ' END, '.', ''), '-', '')) - 1)",
                          label: "RUT Proveedor"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "SUBSTR(REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2wrut} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2wrut} ELSE ' ' END, '.', ''), '-', ''), LENGTH(REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2wrut} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2wrut} ELSE ' ' END, '.', ''), '-', '')), 1)",
                          label: "DV"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.entityid} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.entityid} ELSE ' ' END, '.', ''), '-', '')",
                          label: "Nombre del Proveedor"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "'999'",
                          label: "Tipo de Documento"
                       }),
                       search.createColumn({name: "tranid", label: "Numero del Documento"}),
                       search.createColumn({
                          name: "formulatext",
                          formula: "TO_CHAR({trandate}, 'DDMMYYYY')",
                          label: "Fecha Emision "
                       }),
                       search.createColumn({
                          name: "formulanumeric",
                          formula: "ABS({amount})",
                          label: "Monto del Documento"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "' '",
                          label: "Observaciones"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "CASE WHEN LPAD(REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2w_prov_emp_codigo_sbif_banco} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2w_prov_emp_codigo_sbif_banco} ELSE ' ' END, '.', ''), '-', ''), 3, '0') = '001' THEN '1' ELSE '7' END",
                          label: "Medio de Pago"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "LPAD(REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2w_prov_emp_codigo_sbif_banco} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2w_prov_emp_codigo_sbif_banco} ELSE ' ' END, '.', ''), '-', ''), 3, '0')",
                          label: "Codigo Banco"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "REPLACE(REPLACE(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.custentity_2w_cuenta_prov_cli_empl} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.custentity_2w_cuenta_prov_cli_empl} ELSE ' ' END, '.', ''), '-', '')",
                          label: "Numero Cuenta"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "'EMA'",
                          label: "Tipo de aviso"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "NVL(CASE WHEN LENGTH({vendor.entityid}) > 0 THEN {vendor.email} WHEN LENGTH({employee.entityid}) > 0 THEN {employee.email} ELSE ' ' END, 'finanzas@flrosas.cl')",
                          label: "Direccion e-mail"
                       }),
                       search.createColumn({
                          name: "formulatext",
                          formula: "'1'",
                          label: "Relleno2"
                       }),
                       search.createColumn({name: "internalid", label: "Pago en NS"})
                    ]
                 });
                 var searchResultCount = transactionSearchObj.runPaged().count;
                 log.debug("transactionSearchObj result count",searchResultCount);

                transactionSearchObj.run().each(function (result) {

                    var detalle = { "tipo": "detalle" };

                    for (var i = 0; i < result.columns.length; i++) {
                        detalle[result.columns[i].label] = result.getValue({ name: result.columns[i] });
                    }

                    searchResults.push(detalle);

                    return true;
                });


            } catch (e) {
                log.error({ title: 'Obtener registros - excepcion', details: JSON.stringify(e) });
                throw new Error(e)
            }

            return searchResults;
        }

        function getNombreArchivo() {

            var idNomina = runtime.getCurrentScript().getParameter("custscript_2win_idnominapago_chile");

            var nombre = 'NominaPagos';
            nombre += completaString(idNomina, 5, '0', 'left');
            nombre += '.csv' // Extencion

            return nombre;
        }

        function sinDecimal(monto) {
            var sinDecimal = monto.split('.');
            if (sinDecimal.length > 0) {
                return sinDecimal[0]
            }

            return ''
        }

        function completaString(text, space, character, direccion) {
            var init = 0;
            var end = 0;

            text = String(text);
            var arrString = text.split('');
            for (var i = 0; i < space; i++) {
                if (direccion == 'left') {
                    arrString.unshift(character);
                } else if (direccion == 'right') {
                    arrString.push(character);
                }
            }
            text = arrString.join('');

            if (direccion == 'left') {
                init = Number(space * -1);
                end = Number(text.length);
            } else if (direccion == 'right') {
                end = Number(space) - Number(text.length);
                if (end == 0) {
                    end = space;
                }
            }

            text = text.slice(init, end);
            return text;
        }

        function getDateStringFormat(fecha) {

            var fecha = new Date()
            var anyo = fecha.getFullYear();
            var mes = fecha.getMonth() + 1;
            var dia = fecha.getDate();

            return (anyo + ("0" + mes).slice(-2) + ("0" + dia).slice(-2));
        }

        function getHoraStringFormat() {

            var fecha = new Date()
            var hora = fecha.getHours();
            var minuto = fecha.getMinutes();
            var segundo = fecha.getSeconds();
            var miliseg = fecha.getMilliseconds();

            return (("0" + hora).slice(-2) + ("0" + minuto).slice(-2) + ("0" + segundo).slice(-2) + ("00" + miliseg).slice(-3));
        };

        function validaStringNone(text, space, character, direccion) {

            text = String(text);

            if (text.length > 0 && text.trim() == "- None -") {
                return completaString('', space, character, direccion);
            }

            return text;
        }
    });
