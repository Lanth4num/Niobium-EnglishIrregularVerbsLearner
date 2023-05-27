const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('eAPI', {
    listsGetter: () => ipcRenderer.invoke('checkLists'),
    FileToArr: (fileName) => ipcRenderer.invoke('FileToArr', fileName),
    trainCreator: (settingObject) => ipcRenderer.invoke('createTest', settingObject),
    PDFCreator: (settingObject) => ipcRenderer.invoke('createPDF', settingObject),
    getListMetadata: (list) => ipcRenderer.invoke('getListMetadata', list),
    importFile: () => ipcRenderer.invoke('importFile'),
    getSublists: (fileName) => ipcRenderer.invoke('getSublists', fileName)
})
