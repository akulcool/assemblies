import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Fuse = require("fuse.js"); // Import Fuse.js for fuzzy matching
const fs = require("fs-extra"); // Import the File System module

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize Google Generative AI with your API key
const genAI = new GoogleGenerativeAI("AIzaSyA71dejbWMRK8jTqRhUIoa_uvWIjj0Lpe4");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


function fillPolygonMissingValues(obj) {
    function getRandomNumber(min = 1, max = 10) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    function getRandomBoolean() {
        return Math.random() < 0.5;
    }
    
    function getRandomString(options) {
        return options[Math.floor(Math.random() * options.length)];
    }
    
    if (!obj.polygonDimensions) obj.polygonDimensions = {};
    obj.polygonDimensions.sideLength ??= getRandomNumber(5, 50);
    obj.polygonDimensions.height ??= getRandomNumber(5, 50);
    
    if (!obj.shell) obj.shell = {};
    obj.shell.hasShell ??= getRandomBoolean();
    obj.shell.wallThickness ??= getRandomNumber(1, 5);
    obj.shell.wallType ??= getRandomString(["1", "2"]);
    
    if (!obj.cutouts) obj.cutouts = [];
    obj.cutouts.forEach(cutout => {
        cutout.Xvalue ??= getRandomNumber();
        cutout.Yvalue ??= getRandomNumber();
        cutout.position ??= getRandomString(["top", "bottom", "front", "back", "right", "left"]);
        cutout.shape ??= getRandomNumber(1, 10);
        cutout.depth ??= getRandomNumber(1, 5);
        cutout.sideLength ??= getRandomNumber(1, 10);
        cutout.length ??= getRandomNumber(1, 20);
        cutout.width ??= getRandomNumber(1, 20);
        cutout.diameter ??= getRandomNumber(1, 20);
    });
    
    if (!obj.patterns) obj.patterns = [];
    obj.patterns.forEach(pattern => {
        pattern.shape ??= getRandomNumber(1, 10);
        pattern.patternType ??= getRandomNumber(1, 2);
        pattern.circularRadius ??= getRandomNumber(1, 20);  
        pattern.xSpacing ??= getRandomNumber(1, 20);
        pattern.ySpacing ??= getRandomNumber(1, 20);
        pattern.sideLength ??= getRandomNumber(1, 10);
        pattern.length ??= getRandomNumber(1, 20);
        pattern.width ??= getRandomNumber(1, 20);
        pattern.style ??= getRandomString(["engraved", "embossed"]);
        pattern.diameter ??= getRandomNumber(1, 20);
        pattern.depth ??= getRandomNumber(1, 5);
        pattern.position ??= getRandomString(["top", "bottom", "front", "back", "right", "left"]);
        pattern.numberOfPattern ??= getRandomNumber(1, 10);
    });
    
    return obj;
}



// In-memory store for session-based JSON states
const sessionStates = {};
const basejson = `
   {
    "polygonDimensions": {
        "shape": ,
        "sideLength": ,
        "height": ,
        "color": ""
    },
    "cutouts": [
        {
            "position": "bottom",
            "Xvalue": ,
            "Yvalue": ,
            "depth": 5,
            "sideLength": ,
            "shape": ,
            "length": ,
            "width": ,
            "diameter": 7
        },
        {
            "position": "top",
            "Xvalue": ,
            "Yvalue": ,
            "depth": 3,
            "sideLength": ,
            "shape": ,
            "length": ,
            "width": ,
            "diameter": 7
        }
    ],
    "patterns": [
        {
            "patternType": 2,
            "shape": ,
            "sideLength": ,
            "position": "top",
            "circularRadius": ,
            "length":,
            "width": ,
            "style": "engraved",
            "diameter": ,
            "numberOfPattern": ,
            "depth": ,
            "xSpacing": ,
            "ySpacing": 
        },
    ],
    "shell": {
        "hasShell": true,
        "wallThickness": 2,
        "wallType": "1"
    },
}`;


// Function to generate or modify content with state awareness
async function generateContent(userPromptPart,isAssembly) {
  try {

    const shape_mapping = {
        "circular": "1",
        "rectangle": "2",
        "triangle": "3",
        "rhombus": "4",
        "pentagon": "5",
        "hexagon": "6",
        "heptagon": "7",
        "octagon": "8",
        "nonagon": "9",
        "decagon": "10"
    }
    
    const dimjson  = `
    {
    "polygonDimensions": {
        "shape": ,
        "sideLength": ,
        "height": ,
        "color": ""
    },
    "shell": {
        "hasShell": ,
        "wallThickness": ,
        "wallType": ""
    },`
    
    const dimensions = "Using the following dats present in :"+userPromptPart+"assign dimensions in this format:"+dimjson+"note that wallType is either 'Closed Bottom(IF WE CHOOSE THIS OPTION THEN Fill the field with '1'(string form))' or 'Through & Through(IF WE CHOOSE THIS OPTION THEN Fill the field with '2'(string form))' .In case of shape.Use the data present in"+shape_mapping+"for the shape field in the json, fill the number in the field for example if i want triangle check for triangle in the mapping and fill shape field with the corresponding numeric code and similarly for other shapes. Color to be in hex format only ";
    
    const dimensions_cont = (await model.generateContent(dimensions)).response.text();


  const final = "using the data and jsons provided:"+dimensions_cont+"generate the final json in the exact format:."+basejson+"print only the json+";

    const finalJson = (await model.generateContent(final)).response.text();

    const jsonMatch = finalJson.match(/{[\s\S]*}/);

    const fixed_json = fillPolygonMissingValues(JSON.parse(jsonMatch[0]));





    const finalOutput = {
          response: JSON.stringify(fixed_json),
        };
        console.log(finalOutput);
        return finalOutput;
                    
      } 
     
    
   catch (error) {
    throw error;
  }
}



export default generateContent;