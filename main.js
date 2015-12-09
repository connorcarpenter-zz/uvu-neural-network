function init(){
    //setup data load/save buttons
    document.getElementById('loadData').addEventListener('change', getDataFileFromInput, false);
    document.getElementById('saveData').addEventListener('click', saveTextAsFile, false);

    //setup canvas
	var canvas = document.getElementById('myCanvas');
	var context = canvas.getContext('2d');
    scope.canvas = {obj: canvas, context: context, width: 640, height: 540, cellWidth: 16, cellHeight: 18};
    scope.canvas.rows = scope.canvas.width / scope.canvas.cellWidth;
    scope.canvas.columns = scope.canvas.height / scope.canvas.cellHeight;
    scope.mouse = {x:0,y:0,click:false, clickCount:0};
    canvas.addEventListener('mousemove', function(evt) {
        getMousePos(scope.mouse, scope.canvas.obj, evt);
    }, false);
    canvas.addEventListener("mousedown", function(evt){
        doMouseDown(scope.mouse)}, false);
    setInterval(function() {
        drawMain(scope);
    }, 100);

    //setup other data
    scope.data = {sampleSets: []};
    scope.fileLoaded = false;
    scope.objects = [];
    scope.bigImage = {setIndex:0, sampleIndex:0, hovering:false, selected:false, hoverSetIndex:0, hoverSampleIndex:0};
    createUI(scope, "objects");
}

function doMouseDown(mouse){
    mouse.click = true;
    mouse.clickCount = 3;
}

function getMousePos(mouse, canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = evt.clientX - rect.left;
    mouse.y = evt.clientY - rect.top;
}

function getDataFileFromInput() {
    var file = document.getElementById('loadData').files[0];
    var reader = new FileReader();

    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            var jsonString = evt.target.result.trim();
            scope.data = JSON.parse(jsonString);
            scope.fileLoaded = true;
            createUI(scope, "objects");
        }
    };

    var blob = file.slice(0, file.size);
    reader.readAsText(blob);
}

function saveTextAsFile() {
    var textToWrite = JSON.stringify(scope.data, null, 2);
    var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
    var fileNameToSaveAs = "data.json";

    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    if (window.webkitURL != null) { // for chrome
        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    } else { //for firefox
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    }

    downloadLink.click();
}

function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

function drawMain(scope) {
    scope.bigImage.hovering=false;
    scope.canvas.context.fillStyle="white";
    scope.canvas.context.fillRect(0,0,scope.canvas.width,scope.canvas.height);
    var drawer = {x:0, y: 0};
    drawList(scope, drawer, scope.objects);
    if(scope.mouse.clickCount>0){
        scope.mouse.clickCount-=1;
        if(scope.mouse.clickCount == 0) {
            if(scope.mouse.click){
                scope.bigImage.selected = false;
                scope.mouse.click = false;
            }
        }
    }
}

function drawList(scope, drawer, list) {
    for(var i=0;i<list.length;i++){
        var obj = list[i];
        obj.draw(scope.canvas, drawer);
        if(obj.children && obj.children.length>0)
            drawList(obj.children);
    }
}

function clearObjects(parent, childrenKey){
    var objectList = parent[childrenKey];
    for(var i=0;i<objectList.length;i++){
        if (objectList[i].children)
            clearObjects(objectList[i], "children");
        delete objectList[i];
    }
    parent[childrenKey] = [];
}

function createUI(scope, listKey){
    clearObjects(scope, listKey);
    objectList = scope[listKey] = [];
    var newObj;
    newObj = new ObjText(scope, "Samples:");
    objectList.push(newObj);

    objectList.push(new ObjNewLine(2));

    for (var i=0;i<scope.data.sampleSets.length; i++) {
        newObj = new ObjSampleLabel(scope, scope.data.sampleSets, i);
        objectList.push(newObj);

        var sampleSet = scope.data.sampleSets[i];
        for (var j=0;j<sampleSet.samples.length;j++){
            newObj = new ObjSampleImage(i, j);
            objectList.push(newObj);
        }

        objectList.push(new ObjNewLine(1));
    }
    objectList.push(new ObjNewLine(1));
    objectList.push(new ObjBigImage(scope));
}

function ObjText(scope, text) {
    this.width = scope.canvas.cellWidth*2;
    this.text = text;
    this.children = [];
    this.draw = function (canvas, drawer) {
        var x = drawer.x;
        var y = drawer.y;
        canvas.context.font = "24px Verdana";
        canvas.context.textBaseline="hanging";
        canvas.context.fillStyle="#000000";
        canvas.context.fillText(this.text, x, y);
        drawer.x += this.width;
    }
}

function ObjSampleLabel(scope, sampleSets, index) {
    this.sampleSets = sampleSets;
    this.index = index;
    this.text = sampleSets[index].name;
    this.height = 1 * scope.canvas.cellHeight;
    this.width = -1;
    this.children = [];
    this.draw = function (canvas, drawer) {
        var x = drawer.x;
        var y = drawer.y;
        canvas.context.font = "18px Verdana";
        canvas.context.textBaseline="hanging";
        if(mouseHover(scope, drawer.x, drawer.y, this.width, this.height)){
            canvas.context.fillStyle="#3366ff";
            if (mouseClick(scope)){
                var newName = prompt("Enter new name for this sample set:", this.text);
                this.text = newName;
                this.sampleSets[this.index].name = newName;
                this.width = -1;
            }
        } else {
            canvas.context.fillStyle="#000066";
        }
        if (this.width == -1){
            this.width = canvas.context.measureText(this.text).width + scope.canvas.cellWidth;
        }
        canvas.context.fillText(this.text, x, y);
        drawer.x += this.width;
    }
}

function ObjSampleImage(setIndex, sampleIndex){
    this.setIndex = setIndex;
    this.sampleIndex = sampleIndex;
    this.height = 1 * scope.canvas.cellHeight;
    this.width = (1 * scope.canvas.cellWidth) + 2;
    this.draw = function (canvas, drawer) {
        var x = drawer.x;
        var y = drawer.y;
        var dataString = scope.data.sampleSets[setIndex].samples[this.sampleIndex];
        var currentlySelected = (scope.bigImage.selected
            && scope.bigImage.setIndex === this.setIndex
            && scope.bigImage.sampleIndex === this.sampleIndex);
        if(mouseHover(scope, drawer.x, drawer.y, this.width, this.height)){
            if (mouseClick(scope)) {
                scope.bigImage.selected = true;
                scope.bigImage.setIndex = this.setIndex;
                scope.bigImage.sampleIndex = this.sampleIndex;
                canvas.context.fillStyle="#99ff99";
            } else {
                if(!currentlySelected) {
                    scope.bigImage.hovering = true;
                    scope.bigImage.hoverSetIndex = this.setIndex;
                    scope.bigImage.hoverSampleIndex = this.sampleIndex;
                    canvas.context.fillStyle = "#bfbfbf";
                }
            }
        } else {
            canvas.context.fillStyle = "#f2f2f2";
        }
        if(currentlySelected) {
            canvas.context.fillStyle = "#99ff99";
        }
        drawBinaryImage(canvas, x, y, dataString, 1);
        drawer.x += this.width;
    }
}

function ObjBigImage(scope){
    this.scope = scope;
    this.height = 16 * scope.canvas.cellHeight;
    this.width = (16 * scope.canvas.cellWidth) + 2;
    this.leftPadding = (2*scope.canvas.cellWidth);
    this.draw = function (canvas, drawer) {
        drawer.x += this.leftPadding;
        var x = drawer.x;
        var y = drawer.y;
        var setIndex, sampleIndex;
        if (this.scope.bigImage.hovering) {
            setIndex = this.scope.bigImage.hoverSetIndex;
            sampleIndex = this.scope.bigImage.hoverSampleIndex;
            canvas.context.fillStyle="#f2f2f2";
        } else {
            if (this.scope.bigImage.selected) {
                setIndex = this.scope.bigImage.setIndex;
                sampleIndex = this.scope.bigImage.sampleIndex;
                canvas.context.fillStyle="#99ff99";
            } else {
                sampleIndex = -1;
                canvas.context.fillStyle="#f2f2f2";
                canvas.context.fillRect(x,y,canvas.cellWidth*16,canvas.cellHeight*16);
            }
        }
        var sampleSet = this.scope.data.sampleSets[setIndex];
        if(!sampleSet) return;
        var sampleString = sampleSet.samples[sampleIndex];
        if(!sampleString) sampleString = "";
        drawBinaryImage(canvas, x, y, sampleString, 16);
        drawer.x += this.width;
    }
}

function drawBinaryImage(canvas, x, y, str, scale){

    canvas.context.fillRect(x,y,canvas.cellWidth*scale,canvas.cellHeight*scale);

    scale*=2;

    canvas.context.fillStyle="#000000";

    var cx = 0;
    var cy = 0;
    for(var i=0;i<str.length;i++){

        var chr = str[i];
        if (chr == '1') {
            canvas.context.fillRect(x + (cx*scale),y + (cy*scale),scale,scale);
        }
        cx+=1;
        if(cx>7){cx=0;cy+=1;}
    }
}

function ObjNewLine(height) {
    this.height = height;
    this.draw = function (canvas, drawer) {
        drawer.x = 0;
        drawer.y += (this.height * canvas.cellHeight) + 2;
    }
}

function mouseClick(scope){
    if(scope.mouse.click){
        scope.mouse.click = false;
        return true;
    }
    return false;
}
function mouseHover(scope, x, y, w, h){
    var X = x;
    var Y = y;
    var W = w;
    var H = h;

    if(scope.mouse.x >= X && scope.mouse.x < X+W && scope.mouse.y >= Y && scope.mouse.y < Y + H)
        return true;
    return false;
}
  
init();