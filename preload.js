const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('eAPI', {
    listsGetter: () => ipcRenderer.invoke('checkLists'),
    FileToArr: (fileName) => ipcRenderer.invoke('FileToArr', fileName),
    trainCreator: (settingObject) => ipcRenderer.invoke('createTest', settingObject)
})
