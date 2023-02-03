const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Math = require('math');
const pdfkit = require('pdfkit');

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
  let testObject = await createTest(settingObject);
  let tableData = [];
  for(let i in testObject){
    let a;
    switch(settingObject["GivenVerbs"]){
      case "Infinitive": a = 0 ;break;
      case "Preterit": a = 1 ;break;
      case "PastParticiple": a = 2 ;break;
      case "Translation": a = 3; break;
      case "Random": a = Math.floor(Math.random() * 4);break;
      //setting random as default in case of an issue
      default :  a = Math.floor(Math.random() * 4);break;
    }
    tableData.push([]);
    for(key of Object.keys(testObject[i])){
      tableData[i].push(key == Object.keys(testObject[i])[a] ? testObject[i][key] : "");
    }
  }

  //adding the Table Header
  tableData.unshift([]);
  for(key of Object.keys(testObject[0])){
    tableData[0].push(key.toString());
  }

  // set up the table position and size
  const tableWidth = doc.page.width * 0.85;
  const cellHeight = 35;
  const cellWidth = tableWidth / 4;
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
    let f = await listFileToArr(file);
    for(verb of f){
      completeArr.push(verb);
    }
  }

  //selecting the verbs of the complete array
  //I can do that in a while loop
  for(let i=0; i<settingObject.numberOfVerbs; i++){
    //warn the user if list.length < numberOfVerbs
    if(completeArr.length != 0){
      //choose a random number to get a random verb of the arr
      let a = Math.floor(Math.random() * completeArr.length);
      //error it does not remove the good thing maybe ?
      finalArr.push(completeArr[a]);
      completeArr.splice(a, 1);
    }
  }
  // Fix the code so it detect when 2 verbs are the same, in diffrents files
  return finalArr;
}


//function to get lists
async function getLists(){
  try{
    const filesArr = await fs.promises.readdir(listsPath);
    let fileArrFiltered = [];
    for(file of filesArr){if(file.endsWith('.xlsx')){fileArrFiltered.push(file);}}
    return filesArr;
  }catch(err){console.log(err);return err}
};
//fuction to return an object from a listFile
async function listFileToArr(fileName){
  const fileContent = XLSX.readFile(path.join(listsPath, fileName));
  const fileSheets = fileContent.Sheets;
  const fileFirstSheet = fileSheets[fileContent.SheetNames[0]]
  return XLSX.utils.sheet_to_json(fileFirstSheet);
};

//Listen for app to be ready
app.on('ready', ()=>{

  //IPCMAIN handle dialogs
  ipcMain.handle('checkLists', getLists);
  ipcMain.handle('createPDF', async (event, settingObject)=>{
    return createPDF(settingObject);
  })
  ipcMain.handle('FileToArr', async (event, fileName) => {
    return listFileToArr(fileName);
  });
  ipcMain.handle('createTest', async(event, settingObject) => {
    return createTest(settingObject);
  })
  //check for the app Path and create it if not
  fs.mkdirSync(listsPath, {recursive:true});
  //check for the default.xlsx file
  fs.open(path.join(listsPath, "Default.xlsx"), "wx", function(err, fd){
    if(!err){
      //Create file if it does not exist
      fs.open(path.join(listsPath, "Default.xlsx"), "w", function(err, fd){
        if(err){
          console.log(err);
        }
      });
      fs.readFile(path.join(__dirname, "IrVerbsList.xlsx"), (err, fd)=>{
        if(err){console.log(err);}
        else {
          fs.writeFile(path.join(listsPath, "Default.xlsx"), fd, function(err){if(err){console.log();}});
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
