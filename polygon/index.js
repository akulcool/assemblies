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
const genAI = new GoogleGenerativeAI("AIzaSyA2iDVWxSJBHFp3OcpGj_ftryE28FPnZLA");
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
    obj.shell.wallType ??= getRandomString(["Closed Bottom", "Through & Through"]);
    
    if (!obj.cutouts) obj.cutouts = [];
    obj.cutouts.forEach(cutout => {
        cutout.Xvalue ??= getRandomNumber();
        cutout.Yvalue ??= getRandomNumber();
        cutout.depth ??= getRandomNumber(1, 5);
        cutout.sideLength ??= getRandomNumber(1, 10);
        cutout.length ??= getRandomNumber(1, 20);
        cutout.width ??= getRandomNumber(1, 20);
        cutout.diameter ??= getRandomNumber(1, 20);
    });
    
    if (!obj.patterns) obj.patterns = [];
    obj.patterns.forEach(pattern => {
        pattern.shape ??= getRandomString(["circular", "rectangular", "triangle", "rhombus", "pentagon", "hexagon", "heptagon", "octagon", "nonagon", "decagon"]);
        pattern.sideLength ??= getRandomNumber(1, 10);
        pattern.length ??= getRandomNumber(1, 20);
        pattern.width ??= getRandomNumber(1, 20);
        pattern.style ??= getRandomString(["engraved", "embossed"]);
        pattern.diameter ??= getRandomNumber(1, 20);
        pattern.depth ??= getRandomNumber(1, 5);
        pattern.position ??= getRandomString(["top", "bottom"]);
        pattern.numberOfPattern ??= getRandomNumber(1, 10);
        pattern.Xvalue ??= getRandomNumber();
        pattern.Yvalue ??= getRandomNumber();
    });
    
    return obj;
}



// In-memory store for session-based JSON states
const sessionStates = {};
const basejson = `
    {
    "polygonDimensions": {
        "sideLength": ,
        "height":,
    },
    "shell": {
        "hasShell": ,
        "wallThickness": ,
        "wallType": ""
    },
   
 
    "cutouts": [
        {
            
            "position": "",
            "Xvalue": ,
            "Yvalue": ,
          
            "shape": "rectangle",
            "depth": ,
            "sideLength":,
            "length": ,
            "width": ,
            "diameter": 
        }
    ],
   "patterns": [
        {
            "shape": "",
            "sideLength":,
            "length": ,
            "width": ,
            "style": "",
            "diameter": ,
            "depth": ,
            "position": "",
            "numberOfPattern": ,
           
            "Xvalue": ,
            "Yvalue": 
        
        }
    ]
}`;


// Function to generate or modify content with state awareness
async function generateContent(userPromptPart,isAssembly) {
  try {
    
    const dimjson  = `
    {
    "polygonDimensions": {
        "sideLength": ,
        "height":,
    },
    "shell": {
        "hasShell": ,
        "wallThickness": ,
        "wallType": ""
    },`
    
    const dimensions = "Using the following dats present in :"+userPromptPart+"assign dimensions in this format:"+dimjson+"note that wallType is either 'Closed Bottom' or 'Through & Through' .";
    
    const dimensions_cont = (await model.generateContent(dimensions)).response.text();

    const cutoutjson = `"cutouts": [
        {
            
            "position": "top",
            "Xvalue": ,
            "Yvalue": ,
            "shape": "rectangle",
            "depth": ,
            "sideLength":,
            "length": ,
            "width": ,
            "diameter": 
        }
    ],`

    const cutout = "Using the following data present in :"+userPromptPart+"assign cutouts in this format:"+cutoutjson+"note that shape is either 'rectangle' or 'circle' . position is either 'top' or 'bottom'. incase of 'rectangle' shape assign diameter as 60 and in case of 'circle' assign length and width and depth as 60 . Using a standard coordinate system where origin is the corner of the sides assign Xvalue and Yvalue . Ensure that the cutout is within the dimensions of the polygon.";
    
    const cutout_cont = (await model.generateContent(cutout)).response.text();




    const patternjson = `"patterns": [
        {
            "shape": "",
            "sideLength":,
            "length": ,
            "width": ,
            "style": "",
            "diameter": ,
            "depth": ,
            "position": "",
            "numberOfPattern": ,
           
            "Xvalue": ,
            "Yvalue": 
        
        }
    ]`

  const pattern = "Using the following data present in :"+userPromptPart+"assign cutouts in this format:"+patternjson+"note that shape is either one of these : ''circular', 'rectangular', 'triangle', 'rhombus', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon''. position is either 'top' or 'bottom' ..Style is either 'engraved' or 'embossed'. incase of 'rectangle' shape assign diameter as 60 and in case of 'circle' assign length and width and depth as 60 . Using a standard coordinate system where origin is the corner of the sides assign Xvalue and Yvalue . Ensure that the patterns are within the dimensions of the polygon.";
  
  const pattern_cont = (await model.generateContent(pattern)).response.text();



  const final = "using the data and jsons provided:"+dimensions_cont+" "+cutout_cont+" "+pattern_cont+" "+"generate the final json in the exact format:."+basejson+"print only the json";

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