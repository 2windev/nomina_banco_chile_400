# nomina_banco_chile_400
Implementación para la generación de nominas bancarias.

- Script [2win_ue_generar_nomina.js](2win_ue_generar_nomina.js) de tipo UserEvent que se ejecuta al crear registro en página Nómina de Pago y registra en tabla personalizada (customrecord_2w_nominas_pago).
    1. Obtener datos del formulario.
    2. Verificar el código del banco para decidir que tarea ejecutar.
    3. Ejecutar tarea correspondiente al banco seleccionado.

- Script [2win_mr_crear_nomina_bco_chile.js](2win_mr_crear_nomina_bco_chile.js) de tipo Map/Reduce se ejecuta al ingresar registro en página Nómina de Pago para Banco de Chile y genera archivo TXT.
    1. Obtener parámetros desde script [2win_ue_generar_nomina.js](2win_ue_generar_nomina.js)
    2. Ejecutar búsquedas para obtener detalles de pagos.
    3. Crear registros de detalle en tabla personalizada (customrecord_2w_detalle_nomina_pago)
    4. Generar TXT

- Las tablas involucradas en los formularios son **customrecord_2w_nominas_pago** y **customrecord_2w_detalle_nomina_pago**

    - Campos en **customrecord_2w_nominas_pago**
        - custrecord_2w_detpago_nomina	
 	    - custrecord_2w_detpago_transaccion	
 	    - custrecord_2w_detpago_monto_a_pagar	
 	    - custrecord_2w_detpago_fecha_pago	
 	    - custrecord_2w_detpago_monto_rendido	
 	    - custrecord_2w_detpago_monto_total	
 	    - custrecord_2w_detpago_causa_rechazo	
 	    - custrecord_2w_detpago_fecha_rechazo

    - Nombre formulario preferido para **customrecord_2w_nominas_pago**
        - Nóminas de Pago
    
    - Campos en **customrecord_2w_detalle_nomina_pago**
        - custrecord_2w_detpago_nomina
        - custrecord_2w_detpago_transaccion
        - custrecord_2w_detpago_monto_a_pagar
        - custrecord_2w_detpago_fecha_pago
        - custrecord_2w_detpago_monto_rendido
        - custrecord_2w_detpago_monto_total
        - custrecord_2w_detpago_causa_rechazo
        - custrecord_2w_detpago_fecha_rechazo
    
    - Nombre formulario preferido para **customrecord_2w_detalle_nomina_pago**
        - Standard Detalle Nómina de Pago Form

- El detalle de generación de nóminas se puede visualizar en la página **Detalle Nómina de Pago**

- Para agregar generación de archivo TXT para un nuevo banco se recomienda crear nuevo script de tipo Map/Reduce y agregar lógica correspondiente al script [2win_ue_generar_nomina.js](2win_ue_generar_nomina.js)