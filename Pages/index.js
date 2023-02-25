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
async function applyList(){
	//remove all children of select
	removeAllChild(document.querySelector('#selectVerbList select'));
	const arr = await window.eAPI.listsGetter();
	for(file of arr){
	  //add filename to the dropdown with the value of i
	  addElement('option', document.querySelector('#selectVerbList select'), file.replace('.json', '')).setAttribute('value', file.toString());
	}
	//fix so it takes the "Default" as default obviously
	document.querySelector('#selectVerbList select').firstElementChild.setAttribute('selected', '');

	let elems = document.querySelectorAll('select');
	let selectInstance = M.FormSelect.init(elems, {dropdownOptions:{hover:true}});

	let elem = document.querySelector('.dropdown-trigger');
	let dropdownInstance = M.Dropdown.getInstance(elem);
	dropdownInstance.recalculateDimensions();
  }