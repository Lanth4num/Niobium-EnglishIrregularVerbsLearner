//add Element function (element to add, parent node, eventual text node)
function addElement(element, parent, text=''){
	let newElement = document.createElement(element);
	if(text != ""){
	  let newTextNode = document.createTextNode(text);
	  newElement.appendChild(newTextNode);
	  parent.appendChild(newElement);
	} else {
	  parent.appendChild(newElement);
	}
	return newElement;
}

//remove all child of a node
function removeAllChild(parentNode){
	while(parentNode.hasChildNodes()){
	  parentNode.removeChild(parentNode.firstChild);
	}
	return parentNode;
}

//function to make the select list match list file
async function applyList(countSublists = true){
	//remove all children of select
	removeAllChild(document.querySelector('#selectVerbList select'));
	const arr = await window.eAPI.listsGetter();
	for(file of arr){
	  //add filename to the dropdown with the value of filename
	  if(typeof(file) == "object"){
	
		if(countSublists){
			
			//check for sublists
			let optGroup = addElement('optgroup', document.querySelector('#selectVerbList select'));
			optGroup.setAttribute("label", file["name"].replace('.json', ''))

			//adding the all option in sublist that take the value of the entire list
			addElement('option', optGroup, "All").setAttribute('value', file["name"])
				
			for(sublist of file["sublists"]){
				let subElement = addElement('option', optGroup, sublist);
				subElement.setAttribute('value', file["name"] + ":" + sublist);
			}

		} else {
			addElement('option', document.querySelector('#selectVerbList select'), file["name"].replace('.json', '')).setAttribute('value', file["name"]);
		}
		
	  }else if (typeof(file) == "string"){
		addElement('option', document.querySelector('#selectVerbList select'), file.replace('.json', '')).setAttribute('value', file.toString());
	  }
	}
	//fix so it takes the "Default" as default obviously
	document.querySelector('#selectVerbList select').firstElementChild.setAttribute('selected', '');
	let elems = document.querySelectorAll('select');
	let selectInstance = M.FormSelect.init(elems, {dropdownOptions:{hover:true}});

	let elem = document.querySelector('.dropdown-trigger');
	let dropdownInstance = M.Dropdown.getInstance(elem);
	dropdownInstance.recalculateDimensions();

	return selectInstance;
  }

  //function to convert array of object into HTML table
  function arrToHTMLTable(array, emptyStringToTextInput = false, autocorrect = false){
	let workingArray = array.map(x => x);

	let tableHeader = document.createElement('thead');
	// set the header
	for(Tense of workingArray[0]){
	  addElement("th", tableHeader, Tense);
	}
	workingArray.shift();
	let tbody = document.createElement("tbody");
	for(row of workingArray){
	  let newRow = addElement("tr", tbody);
	  for(col of row){
		if(emptyStringToTextInput && col==""){
			let newData = addElement("td", newRow);
			let newDivContainer = document.createElement('div');
			newDivContainer.setAttribute('class', 'input-field');
			let newTextInput = document.createElement('input');
			newTextInput.setAttribute("type", "text");
			newTextInput.setAttribute("style", "max-height : 60px; color: lightskyblue;");
			newTextInput.setAttribute("onblur", autocorrect ? "lineCorrection(this)" : undefined);
			newDivContainer.appendChild(newTextInput);
			newData.appendChild(newDivContainer);
		} else {
			addElement("td", newRow, col);
		}
	  }
	}
	return[tableHeader, tbody];
  };