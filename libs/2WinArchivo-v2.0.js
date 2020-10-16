/**
 * Herramientas para el manejo de Archivos.
 * @NApiVersion 2.x
 * @NModuleScope Public
 * 
 * @author          Javier Briceño <javier.briceno@2win.cl>
 * @copyright       2WIN
 **/

define(['N/search', 'N/record', 'N/file'], function(search, record, file) {

    /**
     * Atributos de la Tabla "file".
     **/
    var tabFile = {
        type: "file",
        column: [
            search.createColumn({ name: "internalid", label: "internalid" }),
            search.createColumn({ name: "name", label: "name" }),
            search.createColumn({ name: "folder", label: "Folder" }),
            search.createColumn({ name: "documentsize", label: "Size (KB)" }),
            search.createColumn({ name: "url", label: "URL" }),
            search.createColumn({ name: "created", label: "Date Created" }),
            search.createColumn({ name: "modified", sort: search.Sort.DESC, label: "Last Modified" }),
            search.createColumn({ name: "filetype", label: "Type" })
        ]
    }

    /**
     * Atributos de la Tabla "folder".
     **/
    var tabFolder = {
        type: "folder",
        column: [
            search.createColumn({ name: "internalid", label: "Internal ID" }),
            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Name" }),
            search.createColumn({ name: "foldersize", label: "Size (KB)" }),
            search.createColumn({ name: "lastmodifieddate", label: "Last Modified" }),
            search.createColumn({ name: "parent", label: "Sub of" }),
            search.createColumn({ name: "numfiles", label: "# of Files" })
        ]
    }

    /**
     * Extrae el archivo en el empaquetado standard de Netsuite.
     * @param {String} idFile - ID Interno del Archivo.
     * @return {String} Archivo Empaquetado.
     **/
    const getFileObject = function(idFile) {
        var fileObj = file.load({
            id: idFile
        });
        return fileObj;
    }

    /**
     * Crea un archivo nuevo en el File Cabinet.
     * @param {String} idFolder - ID Interno de la Carpeta Contenedora.
     * @param {String} name - Nombre del Archivo.
     * @param {String} type - Tipo de Archivo.
     * @param {String} contents - Contenido del archivo.
     * @return {String} ID Interno del Archivo Creado.
     **/
    const createFile = function(idFolder, name, type, contents, description, encoding) {
        try {
            var metasFile = {
                name: name,
                fileType: type,
                contents: contents,
                folder: idFolder,
                description: description,
                encoding: encoding,
            }

            var newFile = file.create(metasFile);
            fileId = newFile.save();
            return fileId.toString();
        } catch (e) {
            log.error({
                title: 'archivo.createFile - Ln. 51',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Obtener el Contenido de un archivo de texto plano.
     * (Solo valido para PlainText y CSV)
     * @param {String} idFile - ID Interno del archivo.
     * @return {String} Contenido del archivo.
     **/
    const getContentTextFile = function(idFile) {
        try {
            var fileObj = file.load({
                id: idFile
            });

            if (fileObj.fileType === 'PLAINTEXT' || fileObj.fileType === 'CSV' || fileObj.fileType === 'XMLDOC' || fileObj.fileType === 'HTMLDOC') {
                if (fileObj.size < 10485760) {
                    return fileObj.getContents();
                } else {
                    log.error({
                        title: 'archivo.getContentTextFile - Ln. 78',
                        details: 'El Tamaño del Archivo no esta permitido para Lectura'
                    });
                }
            } else {
                log.error({
                    title: 'archivo.getContentTextFile - Ln. 78',
                    details: 'El Archivo no es Texto Plano - ' + fileObj.fileType
                });
                return []
            }
        } catch (e) {
            log.error({
                title: 'archivo.getContentTextFile - Ln. 78',
                details: JSON.stringify(e)
            });
            return []
        }
        return null;
    }

    /**
     * Consulta en la BD el Internal ID de un archivo presente en una carpeta.
     * @param {String} name - Nombre del archivo. 
     * @param {String} idFolder - ID Interno de la Carpeta. 
     * @return {String} Internal Id del archivo.
     **/
    const getFileIdByName = function(name, idFolder) {
        try {
            var dataFolder = [];

            var condicion = [
                ["folder", "anyof", idFolder],
                "AND", ["name", "is", name]
            ];

            var saveSearch = search.create({
                type: tabFile.type,
                filters: condicion,
                columns: tabFile.column
            });

            saveSearch.run().each(function(item) {
                dataFolder.push({
                    internalid: item.getValue('internalid')
                });
            });

            if (dataFolder.length > 0) {
                var fileId = dataFolder[0].internalid;
                return fileId;
            } else {
                log.error({
                    title: 'archivo.getFileIdByName - Ln. 114',
                    details: 'Archivo no Encontrado'
                });
            }

        } catch (e) {
            log.error({
                title: 'archivo.getFileIdByName - Ln. 114',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Extrae los Metadatos correspondientes a un archivo.
     * @param {String} fileId - ID Interno del Archivo. 
     * @return {Object} Metadatos del Archivo.
     **/
    const getFileMetadata = function(fileId) {
        try {
            var dataFile = [];

            var condicion = [
                ["internalid", "anyof", fileId]
            ];

            var saveSearch = search.create({
                type: tabFile.type,
                filters: condicion,
                columns: tabFile.column
            });

            saveSearch.run().each(function(item) {
                dataFile.push({
                    internalid: item.getValue('internalid'),
                    name: item.getValue('name'),
                    folder: item.getValue('folder'),
                    documentsize: item.getValue('documentsize'),
                    url: item.getValue('url'),
                    created: item.getValue('created'),
                    modified: item.getValue('modified'),
                    filetype: item.getValue('filetype'),
                });
            });

            if (dataFile.length > 0) {
                return dataFile[0];
            } else {
                log.error({
                    title: 'archivo.getFileMetadata - Ln. 159',
                    details: 'Archivo no Encontrado'
                });
            }

        } catch (e) {
            log.error({
                title: 'archivo.getFileMetadata - Ln. 135',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Consulta el registro de archivos que fueron modificados en una fecha.
     * @param {String} fechaCreado - Fecha de Creacion del Archivo.
     * @param {String} idFolder - Internal id de la Carpeta Contenedora.
     * @return {Array} Arreglo de metadatos de los archivos.
     **/
    const getFileByDateUpdate = function(fechaCreado, idFolder) {
        try {
            var res = [];

            var condicion = [
                ["folder", "anyof", idFolder],
                "AND", ["modified", "on", fechaCreado]
            ];

            var saveSearch = search.create({ type: tabFile.type, filters: condicion, columns: tabFile.column });
            log.debug({
                title: 'Fecha de carpeta',
                details: {
                    fecha: fechaCreado,
                    id: idFolder
                }
            })

            saveSearch.run().each(function(item) {
                res.push({
                    internalid: item.getValue('internalid'),
                    name: item.getValue('name'),
                    folder: item.getValue('folder'),
                    size: item.getValue('documentsize'),
                    url: item.getValue('url'),
                    created: item.getValue('created'),
                    modified: item.getValue('modified'),
                    filetype: item.getValue('filetype'),
                });
                return true;
            });

            return res;

        } catch (e) {
            log.error({
                title: 'archivo.getFileByDateUpdate - Ln. 210',
                details: JSON.stringify(e)
            });
        }

        return null;
    };

    /**
     * Renombrar un Archivo.
     * @param {String} idFile - ID Interno del Archivo.
     * @param {String} newName - Nuevo Nombre del Archivo.
     * @return {String} ID Interno del Archivo Renombrado.
     **/
    const renameFile = function(idFile, newName) {
        try {
            var fileObj = file.load({
                id: idFile
            });
            fileObj.name = newName;
            var idFileRename = fileObj.save();

            return idFileRename.toString();
        } catch (e) {
            log.error({
                title: 'archivo.renameFile - Ln. 253',
                details: JSON.stringify(e)
            });
        }
    }

    /**
     * Eliminar un Archivo.
     * @param {String} idFile - ID Interno del Archivo.
     * @return {String} ID Interno del Archivo Eliminado.
     **/
    const deleteFile = function(idFile) {
        try {
            file.delete({
                id: idFile
            });
            return idFile;
        } catch (e) {
            log.error({
                title: 'archivo.deleteFile - Ln. 275',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Crea una nueva carpeta en el File Cabinet.
     * @param {String} name - Nombre de la Carpeta.
     * @param {String} idParentFolder - (Opcional) ID Interno de la Carpeta Contenedora.
     * @return {String} ID Interno de la Carpeta Creada.
     **/
    const createFolder = function(name, idParentFolder) {
        try {
            var objRecord = record.create({ type: String(tabFolder.type), isDynamic: true });

            objRecord.setValue({ fieldId: 'name', value: name });
            objRecord.setValue({ fieldId: 'parent', value: idParentFolder });

            var idFolder = objRecord.save({ ignoreMandatoryFields: true });

            return idFolder.toString();

        } catch (e) {
            log.error({
                title: 'archivo.createFolder - Ln. 296',
                details: JSON.stringify(e)
            });
        }

        return null;
    }

    /**
     * Consulta el Internal ID de la carpeta Sen el file cabinet.
     * @param {String} name - Nombre de la carpeta. 
     * @return {String} Internal Id de la Carpeta.
     **/
    const getFolderIdByName = function(name) {
        try {
            var dataFolder = [];

            var condicion = [
                ['name', 'is', name]
            ];

            var saveSearch = search.create({ type: tabFolder.type, filters: condicion, columns: tabFolder.column });

            log.debug({
                title: 'Nombre de carpeta',
                details: name
            })

            saveSearch.run().each(function(item) {
                dataFolder.push({
                    internalid: item.getValue('internalid'),
                });
            });

            if (dataFolder.length > 0) {
                var folderId = dataFolder[0].internalid;
                return folderId;
            }

        } catch (e) {
            log.error({
                title: 'archivo.getFolderIdByName - Ln. 322',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Extrae los Metadatos correspondientes a una Carpeta.
     * @param {String} folderId - ID Interno del Archivo. 
     * @return {Object} Metadatos del Archivo.
     **/
    const getFolderMetadata = function(folderId) {
        try {
            var dataFolder = [];

            var condicion = [
                ["internalid", "anyof", folderId]
            ];

            var saveSearch = search.create({
                type: tabFolder.type,
                filters: condicion,
                columns: tabFolder.column
            });

            saveSearch.run().each(function(item) {
                dataFolder.push({
                    internalid: item.getValue('internalid'),
                    name: item.getValue('name'),
                    foldersize: item.getValue('foldersize'),
                    lastmodifieddate: item.getValue('lastmodifieddate'),
                    parent: item.getValue('parent'),
                    numfiles: item.getValue('numfiles'),
                });
            });

            if (dataFolder.length > 0) {
                return dataFolder[0];
            } else {
                log.error({
                    title: 'archivo.getFolderMetadata - Ln. 357',
                    details: 'Archivo no Encontrado'
                });
            }

        } catch (e) {
            log.error({
                title: 'archivo.getFolderMetadata - Ln. 357',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Renombrar una Capeta.
     * @param {String} idFolder - ID Interno de la Carpeta Contenedora.
     * @param {String} newName - Nuevo Nombre del Archivo.
     * @return {String} ID Interno del Archivo Renombrado.
     **/
    const renameFolder = function(idFolder, newName) {
        try {
            var folderObj = record.load({
                type: tabFolder.type,
                id: idFolder,
            });

            folderObj.setValue({
                fieldId: 'name',
                value: newName
            });

            var idFolderRename = folderObj.save();

            return idFolderRename.toString();
        } catch (e) {
            log.error({
                title: 'archivo.renameFolder - Ln. 406',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    /**
     * Elimina una Carpeta.
     * @param {String} idFolder - ID Interno de la Carpeta.
     * @return {String} ID Interno de la Carpeta Eliminada.
     **/
    const deleteFolder = function(idFolder) {
        try {
            var idDeleteFolder = record.delete({
                type: String(tabFolder.type),
                id: idFolder,
            });
            return idDeleteFolder.toString();
        } catch (e) {
            log.error({
                title: 'archivo.deleteFolder - Ln. 434',
                details: JSON.stringify(e)
            });
        }
        return null;
    }

    const mockArchivo = function() {
        var result = false;

        var idMockFolder = createFolder('testFolder');
        result = idMockFolder !== null ? true : false;
        log.debug({
            title: 'mock.createFolder - RESULT',
            details: 'createFolder: ' + idMockFolder + ' !== null => Test: ' + result
        });

        var idFolder = getFolderIdByName('testFolder');
        result = ((idFolder === idMockFolder) && (idFolder !== null)) ? true : false;
        log.debug({
            title: 'mock.getFolderIdByName - RESULT',
            details: 'getFolderIdByName: ' + idFolder + ' !== null => Test: ' + result
        });

        var metaFolder = getFolderMetadata(idMockFolder);
        result = ((metaFolder.internalid === idMockFolder) && (metaFolder !== null)) ? true : false;
        log.debug({ title: 'mock.getFolderMetadata - RESULT', details: 'getFolderMetadata: ' + JSON.stringify(metaFolder) + ' !== null => Test: ' + result });

        var mockRenameFolder = renameFolder(idMockFolder, 'mockFolder');
        idFolder = getFolderIdByName('mockFolder');
        result = ((mockRenameFolder === idFolder) && (mockRenameFolder !== null)) ? true : false;
        log.debug({ title: 'mock.renameFolder - RESULT', details: 'renameFolder: ' + mockRenameFolder + ' !== null => Test: ' + result });

        var content = 'mockFile-id:' + idMockFolder;
        var idMockFile = createFile(idMockFolder, 'testFile.txt', file.Type.PLAINTEXT, content, 'mockFile');
        result = idMockFile !== null ? true : false;
        log.debug({ title: 'mock.createFile - RESULT', details: 'createFile: ' + idMockFile + ' !== null => Test: ' + result });

        var contentFile = getContentTextFile(idMockFile);
        result = ((contentFile === content) && (contentFile !== null)) ? true : false;
        log.debug({ title: 'mock.getContentTextFile - RESULT', details: 'getContentTextFile: ' + contentFile + ' !== null => Test: ' + result });

        var idFile = getFileIdByName('testFile.txt', idMockFolder);
        result = ((idFile === idMockFile) && (idFile !== null)) ? true : false;
        log.debug({ title: 'mock.getFileIdByName - RESULT', details: 'getFileIdByName: ' + idFile + ' !== null => Test: ' + result });

        var metaFile = getFileMetadata(idMockFile);
        result = ((metaFile.internalid === idMockFile) && (metaFile !== null)) ? true : false;
        log.debug({
            title: 'mock.getFileMetadata - RESULT',
            details: 'getFileMetadata: ' + JSON.stringify(metaFile) + ' !== null => Test: ' + result
        });

        var mockRenameFile = renameFile(idMockFile, 'mockFile.txt');
        idFile = getFileIdByName('mockFile.txt', idMockFolder);
        result = ((mockRenameFile === idFile) && (mockRenameFile !== null)) ? true : false;
        log.debug({
            title: 'mock.renameFile - RESULT',
            details: 'renameFile: ' + mockRenameFile + ' !== null => Test: ' + result
        });

        var mockDeleteFile = deleteFile(idMockFile);
        metaFile = getFileMetadata(mockDeleteFile);
        result = ((mockDeleteFile === idMockFile) && (metaFile === null)) ? true : false;
        log.debug({
            title: 'mock.deleteFile - RESULT',
            details: 'deleteFile: ' + mockDeleteFile + ' === null => Test: ' + result
        });

        var mockDeleteFolder = deleteFolder(idMockFolder);
        metaFolder = getFolderMetadata(mockDeleteFolder);
        result = ((mockDeleteFolder === idMockFolder) && (metaFolder === null)) ? true : false;
        log.debug({
            title: 'mock.deleteFolder - RESULT',
            details: 'deleteFolder: ' + mockDeleteFolder + ' === null => Test: ' + result
        });
    }

    return {
        type: file.Type,
        encoding: file.Encoding,
        getFileObject: getFileObject,
        createFile: createFile,
        getContentTextFile: getContentTextFile,
        getFileIdByName: getFileIdByName,
        getFileMetadata: getFileMetadata,
        getFileByDateUpdate: getFileByDateUpdate,
        renameFile: renameFile,
        deleteFile: deleteFile,
        createFolder: createFolder,
        getFolderIdByName: getFolderIdByName,
        getFolderMetadata: getFolderMetadata,
        renameFolder: renameFolder,
        deleteFolder: deleteFolder,
        mockArchivo: mockArchivo
    }
});