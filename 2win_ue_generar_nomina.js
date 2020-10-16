/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 */
define(['N/task'],

    /**
     * @param {task} task
     */
    function (task) {

        function beforeLoad(context) {

        }

        function beforeSubmit(context) {

        }

        function afterSubmit(context) {

            var nomina = context.newRecord;

            log.debug({ title: 'afterSubmit', details: 'type: ' + context.type });

            if (context.type == context.UserEventType.CREATE) {

                // Dado el codigo de banco se envia a Map/Reduce correspondiente ya que los archivos a generar son diferentes.
                var codigoBanco = nomina.getValue('custrecord_2w_nompago_banco');
                log.debug({ title: 'afterSubmit', details: 'Código Banco: ' + codigoBanco });

                if (codigoBanco == Bancos.CHILE) {

                    // Se envia a proceso para nomina Banco de Chile
                    var taskUpdateStatus = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_2win_mr_crea_nom_bco_chile',
                        deploymentId: 'customdeploy_2win_mr_crea_nom_bco_chile',
                        params: {
                            'custscript_2win_idnominapago_chile': nomina.id
                        }
                    });
    
                    taskUpdateStatus.submit();

                }

                log.debug({ title: 'afterSubmit - Informe', details: 'Iniciado Proceso de Recopilacion de Datos Nomina ID ' + nomina.id });
            }
        }

        const Bancos = {
            SANTANDER: 211,
            CHILE: 201
        }

        return {
            //beforeLoad: beforeLoad,
            //beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }
    });
