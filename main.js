const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Math = require('math');
const pdfkit = require('pdfkit');
const { log } = require('console');

const{app, BrowserWindow, ipcMain, dialog} = electron;

let mainWindow;
const listsPath = app.getPath("appData")+"\\IrVerbsApp\\Lists";

//function to create PDF test from an object
async function createPDF(settingObject){

  const doc = new pdfkit({size:"A4"});
  let xPos = 30;
  let yPos = 30;
  doc.save();

  const addTextField = (x, y) => {
    doc.fillColor('black')
    .rect(x, y, 100, 0.5)
    .fill()
    .stroke();
    doc.restore();
  };
  
  //creating the page Header
  let Label = "Name:";
  doc.text(Label, xPos, yPos);
  addTextField(xPos + doc.widthOfString(Label), yPos + doc.heightOfString(Label)*0.75);

  //creating the array
  const meta = await getListMetadata(settingObject["Lists"][0]);
  let testObject = await createTest(settingObject);
  let tableData = [];
  for(let i in testObject){
    let a = settingObject["GivenVerbs"] == -1 ? Math.floor(Math.random() * meta["columnTitle"].length) : settingObject["GivenVerbs"];
    tableData.push([]);
    for(key of Object.keys(testObject[i])){
      tableData[i].push(key == Object.keys(testObject[i])[a] ? testObject[i][key] : "");
    }
  }

  // set up the table position and size
  const tableWidth = doc.page.width * 0.85;
  const cellHeight = 35;
  const cellWidth = tableWidth / tableData[0].length;
  const tableX = (doc.page.width - tableWidth)/2;
  const tableY = tableX + yPos;
  // loop through the table data and create the cells and borders
  for (let i = 0; i < tableData.length; i++) {
    for (let j = 0; j < tableData[i].length; j++) {
      let xCell = tableX + (j * cellWidth);
      let yCell = tableY + (i * cellHeight);
      doc.rect(xCell, yCell, cellWidth, cellHeight).stroke();
      let textWidth = doc.widthOfString(tableData[i][j]);
      let textHeight = doc.heightOfString("u");
      
      if(i===0){
        doc.font("Helvetica-Bold").text(tableData[i][j], xCell + (cellWidth-textWidth)/2,yCell + (cellHeight-textHeight/2)/2, {lineBreak: false});
        doc.font("Helvetica");
      } else {
        doc.text(tableData[i][j], xCell + (cellWidth-textWidth)/2, yCell + (cellHeight-textHeight/2)/2, {lineBreak: false});
      }
    }
  }

  const pdfPath = dialog.showSaveDialogSync({filters: [{ name: 'PDF', extensions: ['pdf'] }]});
  doc.pipe(fs.createWriteStream(pdfPath));
  // end the document
  doc.end();
}


//function to create a test from an object, an 2 dimensional array is returned
async function createTest(settingObject){
  let completeArr = [];
  let finalArr =[];
  //taking all verbs of lists
  for(file of settingObject["Lists"]){
    //handle sublists
    if(file.includes(":")){
      let f = await listFileToArr(file.split(":")[0], false);
      const meta = await getListMetadata(file, true);
      const indexes = meta["indexes"];

      for(let index of indexes){
        console.log(f[index])
        completeArr.push(f[index]);
      }

    } else {
      let f = await listFileToArr(file);
      f.shift();
      for(verb of f){
        completeArr.push(verb);
      }
    }
  }
  //selecting the verbs of the complete array
  //I can do that in a while loop
  for(let i=0; i<settingObject.numberOfVerbs; i++){
    //warn the user if list.length < numberOfVerbs
    if(completeArr.length != 0){
      //choose a random number to get a random verb of the arr
      let a = Math.floor(Math.random() * completeArr.length);
      finalArr.push(completeArr[a]);
      completeArr.splice(a, 1);
    }
  }
  //add the header
  const tenses = await getListMetadata(settingObject["Lists"][0]);
  finalArr.unshift(tenses["columnTitle"]);
  // Fix the code so it detect when 2 verbs are the same, in different files
  return finalArr;
}


//function to get lists
async function getLists(){
  try{
    const filesArr = await fs.promises.readdir(listsPath);
    let fileArrFiltered = [];
    for(file of filesArr){
      if(file.endsWith('.json')){

        // check if it has sublists
        const File = fs.readFileSync(path.join(listsPath, file));
        const data = JSON.parse(File);
        
        fileArrFiltered.push(data["sublists"] ? {"name":file,"sublists":data["sublists"].map(x => x["name"])} : file);
      }
    }
    return fileArrFiltered;
  }catch(err){return err}
};

function getListSublists(list){

  const file = fs.readFileSync(path.join(listsPath, list));
  const data = JSON.parse(file);

  return data["sublists"];
}

//function to get metadata of lists
async function getListMetadata(list, includesIndexForSublists = false){
  let sublist;

  if(list.includes(":")){
    let arrList = list.split(":");
    list = arrList[0];
    sublist = arrList[1];
  } else{
    includesIndexForSublists = false;
  }
  const file = fs.readFileSync(path.join(listsPath, list));
  const data = JSON.parse(file);
  let returnValue = data["metadata"];

  if(includesIndexForSublists){
    let indexes;
    data["sublists"].forEach(element => {
      if(element["name"] == sublist){
        indexes = element["indexes"];
      }
    });
    returnValue["indexes"] = indexes;
  }

  return returnValue;
}


//fuction to return an object from a listFile
function listFileToArr(fileName, withHeader = true){
  let fileRawData = fs.readFileSync(path.join(listsPath, fileName));
  let listObject = JSON.parse(fileRawData);
  let finalArr = listObject["list"];
  if(withHeader){
    finalArr.unshift(listObject["metadata"]["columnTitle"]);
  }
  return finalArr;
};

//function to import files : JSON and XSLX (converted)
async function importFile(){
  const files = dialog.showOpenDialogSync({filters:[
    {name:"Supported files :", extensions:["xlsx", "json"]}
  ]});
  const file = files[0];
  let dirs = file.split("\\");
  let fileName = dirs[dirs.length-1];

  if(files == undefined){
    return "Something went wrong !";
  } else if(file.endsWith(".xlsx")){
      await convertXLSXtoJSON(file);
  } else if (file.endsWith(".json")){ 
      fs.copyFileSync(file, path.join(listsPath, fileName));
  } else {
    console.log("Error occured when choosing the file (probably wrong filetype)");
  }
}

//Listen for app to be ready
app.on('ready', ()=>{

  //IPCMAIN handle dialogs
  ipcMain.handle('checkLists', getLists);
  ipcMain.handle('importFile', importFile);
  ipcMain.handle('getSublists', (event, fileName) => {
    return getListSublists(fileName);
  });
  ipcMain.handle('createPDF', async (event, settingObject)=>{
    return createPDF(settingObject);
  });
  ipcMain.handle('FileToArr', (event, fileName) => {
    return listFileToArr(fileName);
  });
  ipcMain.handle('createTest', async(event, settingObject) => {
    const result = createTest(settingObject);
    return result;
  });
  ipcMain.handle('getListMetadata', async(event, list) => {
    return getListMetadata(list);
  })
  //check for the app Path and create it if not
  fs.mkdirSync(listsPath, {recursive:true});
  //check for the default.xlsx file
  fs.open(path.join(listsPath, "Default.json"), "wx", function(err, fd){
    if(!err){
      //Create file if it does not exist
      fs.open(path.join(listsPath, "Default.json"), "w", function(err, fd){
        if(err){
          console.log(err);
        }
      });
      fs.readFile(path.join(__dirname, "IrVerbsList.json"), (err, fd)=>{
        if(err){console.log(err);}
        else {
          fs.writeFile(path.join(listsPath, "Default.json"), fd, function(err){if(err){console.log();}});
        }
      });
    };
  });


  //Create window
  mainWindow = new BrowserWindow({
    show : false,
    webPreferences:{
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });
  //maximize window size
  mainWindow.maximize();
  mainWindow.show();
  //Load html into window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'Pages' ,'index.html'),
    protocol:'file:',
    slashes: true
  }));
  
});

async function convertXLSXtoJSON(filePath){
  let object = {
    "metadata":{
      title:"",
      description:"",
      columnTitle:[]
	  }
  };
  const fileContent = XLSX.readFile(filePath);
  const fileSheets = fileContent.Sheets;
  const fileFirstSheet = fileSheets[fileContent.SheetNames[0]];
  let rawList = XLSX.utils.sheet_to_json(fileFirstSheet, {header: 1});
  let dirs = filePath.split("\\");
  let fileName = dirs[dirs.length-1];
  object["metadata"]["title"] = fileName.replace(".xlsx", "");
  object["metadata"]["columnTitle"] = rawList.shift();
  object["list"] = rawList;
  console.log(path.join(listsPath, fileName.replace(".xlsx", ".json")));
  fs.writeFileSync(path.join(listsPath, fileName.replace(".xlsx", ".json")), JSON.stringify(object, null, "\t"));
}