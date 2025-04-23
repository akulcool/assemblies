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

// In-memory store for session-based JSON states
const sessionStates = {};
const basejson = `
    {
      "shape": "rectangle",
      "pcbType": "custom",
      "customPcbDetails": {
        "length": ,
        "width": ,
        "thickness": ,
        "mountingHoleDia": ,
        "distanceBetweenEdgesOfHoles": ,
        "hole1Hole2": ,
        "hole3Hole4": ,
        "hole1Hole4": ,
        "hole2Hole3": 
      },
      "enclosureDimensions": {
        "length": ,
        "width": ,
        "height": ,
        "wallThickness": ,
        "hasCornerRadius": true/false,
        "cornerRadius": 
      },
      "lidDimensions": { "height":  },
      "Text": { "position": "top", "content": "stel", "type": "emboss", "size": 2 },
      "color": "#2bb1ae",
      "showPCB": false,
      "showLid": true,
      "showEnclosure": true,
      "lockingType": {
        "lockingType": "screw",
        "screwSize": "M1",
        "screwPosition": "corners",
        "snapFit": ""
      },
      "pcbMounts": { "pcbMounts": "studs", "studPosition": "center" },
      "enclosureMountType": "",
      "cutouts": [ 
        {
          "type": "custom",
          "position": "", 
          "Xvalue": ,
          "Yvalue": ,
          "shape": "rectangle",
          "length": ,
          "width": ,
          "diameter": "",
          "Component Name":""
        },
        {
          "type": "custom",
          "position": "", 
          "Xvalue": ,
          "Yvalue": ,
          "shape": "rectangle",
          "length": ,
          "width": ,
          "diameter": "",
          "Component Name":""
        },
        {
          "type": "custom",
          "position": "", 
          "Xvalue": ,
          "Yvalue": ,
          "shape": "rectangle",
          "length": ,
          "width": ,
          "diameter": "",
          "Component Name":""
        },
        {
          "type": "custom",
          "position": "", 
          "Xvalue": ,
          "Yvalue": ,
          "shape": "rectangle",
          "length": ,
          "width": ,
          "diameter": "",
          "Component Name":""
        }
      ],
      "addOns": { "addOn": "", "position": "" }
    }`;


function parseTable(table) {
  const lines = table.trim().split("\n");
  const headers = lines[0]
    .split("|")
    .map(header => header.trim())
    .filter(header => header); // Extract headers

  const rows = lines.slice(2); // Skip headers and separator lines
  return rows.map(row => {
    const values = row
      .split("|")
      .map(value => value.trim())
      .filter(value => value); // Extract row values
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    return obj;
  });
}

// Function to filter rows by position
function filterByPosition(data, position) {
  return data.filter(row => row["Position"] === position);
}



function preprocessData(data) {
  if (data.customPcbDetails) {
    const defaults = {
      length: 30,
      width: 50,
      thickness: 1,
      mountingHoleDia: 3,
      distanceBetweenEdgesOfHoles: 5,
      hole1Hole2: 10,
      hole3Hole4: 10,
      hole1Hole4: 10,
      hole2Hole3: 10,
    };

    // Replace null, empty string, or 0 with default values
    Object.keys(defaults).forEach((key) => {
      if (
        data.customPcbDetails[key] === null ||
        data.customPcbDetails[key] === "" ||
        data.customPcbDetails[key] === 0
      ) {
        data.customPcbDetails[key] = defaults[key];
      }
    });
  }

  if (data.color) {
    const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
    if (!hexColorRegex.test(data.color)) {
      data.color = "#008000"; // Assign green hex color
    }
  }

  if(data.enclosureDimensions){
    const defaults = {
      length:100,
      width:100,
      height:25,
      wallThickness:1.6,
      hasCornerRadius:"false",
      cornerRadius:0,

    };
    Object.keys(defaults).forEach((key) => {
      if (
        data.enclosureDimensions[key] === null ||
        data.enclosureDimensions[key] === "" ||
        data.enclosureDimensions[key] === 0
      ) {
        data.enclosureDimensions[key] = defaults[key];
      }
    });

  }

  if(data.lidDimensions){
    const defaults = {
      height:5,     
    };

    Object.keys(defaults).forEach((key) => {
      if (
        data.lidDimensions[key] === null ||
        data.lidDimensions[key] === "" ||
        data.lidDimensions[key] === 0
      ) {
        data.lidDimensions[key] = defaults[key];
      }
    });
  }

  return data;
}





// Function to validate JSON
function validateConfig(config) {
  let wasString = false;

  try {
    // Check if input is a string and parse it
    if (typeof config === "string") {
      config = JSON.parse(config);
      wasString = true; // Mark that input was originally a string
    }
     config = preprocessData(config)
    // Ensure the input is an object
    if (typeof config !== "object" || config === null) {
      console.error("Invalid input: Expected an object.");
      return null;
    }


    // Convert back to string if the original input was a string
    return wasString ? JSON.stringify(config, null, 2) : config;
  } catch (err) {
    console.error("Invalid JSON format:", err.message);
    return null;
  }
}





function convertTableToJson(tableString) {
  // Split the table into lines
  const lines = tableString.trim().split("\n");

  // Extract headers from the first line
  const headers = lines[0]
    .split("|")
    .map((header) => header.trim())
    .filter((header) => header); // Filter out empty strings

  // Parse the remaining lines as rows
  const rows = lines.slice(2).map((line) => {
    const values = line
      .split("|")
      .map((value) => value.trim())
      .filter((value) => value); // Filter out empty strings

    // Create an object by mapping headers to values
    const rowObject = {};
    headers.forEach((header, index) => {
      const key = header
        .replace(/ /g, "") // Remove spaces
        .replace(/\(mm\)/g, "") // Remove units like (mm)
        .toLowerCase(); // Convert to lowercase for consistency
      rowObject[key] = isNaN(values[index])
        ? values[index]
        : Number(values[index]); // Parse numbers if possible
    });

    return rowObject;
  });

  return rows;
}


// Function to generate or modify content with state awareness
async function generateContent(userPromptPart,isAssembly) {
  try {
    
    
    const split_info="sentence: "+userPromptPart.toString()+" Task-> from this sentence find out the name of the PCB For which the enclosure needs to be made. Print only the name and strictly use only the sentence provided.";

    const split_res = await model.generateContent(split_info)
    const pcbname = split_res.response.text()
    
    const prompt = "Context: "+userPromptPart.toString()+" . \n Prompt instruction : \nTask 1 : identify and list components mentioned in context. \nTask 2 : identify cutouts required based on functionalities in the above context - ignore cutout for development board as a whole.\n Task 3)provide one single best position for each cutout too where available positions are top,bottom,left,right,front and back.No vague answers please";

    const result = await model.generateContent(prompt);
    
    //Size of enclosure
    const prompt2 = "provide a single suitable size for the enclosure of "+ pcbname.toString()+" in l,b,h form tabular keeping in mind the standard PCB Dimensions obtained from the official sites and documentation.Print only the table ";
    
    const result2 = await model.generateContent(prompt2);
    
    const output = result2.response.text();
    
    
    const dimensionsLine = output.split('\n')[2]; 
    
    
    const dimensions = dimensionsLine.split('|').map(item => item.trim());
    
    
    const l = parseInt(dimensions[1]); 
    const b = parseInt(dimensions[2]); 
    const h = parseInt(dimensions[3]); 
    //table split into l,b,h numerical for easy access
    console.log(l, b, h); 
    
    
    const kb = result.response.text();
    
    const promptx = "use the data in "+kb+" and create a table with values as component name,position(only and exactly one of {Left,Right,Back,Front,Top or Bottom} for each case and for left or right choose the position. No vague answers please),suitable length and suitable width of the cutout should also be present.Print only table nothing apart from it.\nPRINT ONLY THE TABLE STRICTLY NO QUOATATION MARKS OR ANY STRAY SYMBOLS BEFORE OR AFTER THE SAME IN ANY CASE."
    const resultx = await model.generateContent(promptx);
    //tabular form of initial prompt
    const cutoutTable = resultx.response.text();
    
    //parsed data for each side
    const parsedData = parseTable(cutoutTable);
    const backCutouts = filterByPosition(parsedData, "Back");
    const frontCutouts = filterByPosition(parsedData, "Front");
    const leftCutouts = filterByPosition(parsedData, "Left");
    const rightCutouts = filterByPosition(parsedData, "Right");
    const topCutouts = filterByPosition(parsedData, "Top");
    const bottomCutouts = filterByPosition(parsedData, "Bottom");



    
    
    const lock_and_mount  = "Context: Considering  :"+userPromptPart.toString() +"\n1)What can be a suitable enclosure mount type for this usecase, Choose after critical analysis:the exact two options to be considered are 'mountFlange' or 'Belt',make a choice from here and give explanation too and do not change the wording as well as the format of capitalization strictly, if context mentions a specific mount type strictly use it\n2)What kind of Locking type will be good here.Choose after critical analysis: the two options in consideration are {Screws or snapfit}, if you choose screws then mention the screw post size as well ranging from M1 to M7, M1 Being smallest and M7 Being the largest and give reasoning for your answer. If in case the context mentions details about the locking type strictly use that only"
    
    const op = await model.generateContent(lock_and_mount)
    const lock_mount_type = op.response.text();
    
    console.log(lock_mount_type)
    
    
    const json = JSON.stringify(basejson)
    //separate cutouts calculation done for each face
          
    let bposn="";
    if(backCutouts.length>0){
    const promptb = "Provided is the image of the back face of an enclosure with rectangular cutout . The back face dimensions are "+ b + "X"+ h + ". Coordinate axes for the face is shown as well as the rectangle width and length has been labelled, Arrows show directions of width and length increase incase of rectangle. Provide x,y coordinates for the starting points of the rectangular cutouts mentioned in the table shown. Strictly use array values without any change: \n "+  JSON.stringify(backCutouts) +"access along with length and width along these lines . Ensure cutouts do not overlap and do not cross the bounds of the enclosure. Provide answer in tabular form."
    const image = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("enclosure/back.png")).toString("base64"),
        mimeType:"image/png",
    },
    };
    
    const resultb = await model.generateContent([promptb,image]);
     bposn = resultb.response.text();
    }
    
    
    let fposn="";
    if(frontCutouts.length>0){
    const promptf = "Provided is the image of the front face of an enclosure with rectangular cutout . The front face dimensions are "+ b + "X"+ h + ". Coordinate axes for the face is shown as well as the rectangle width and length has been labelled, Arrows show directions of width and length increase incase of rectangle.. Provide x,y coordinates for the starting points of the rectangular cutouts mentioned in the table shown. Strictly use array values without any change: \n "+ JSON.stringify(frontCutouts) +"access along with length and width along these lines . Ensure cutouts do not overlap and do not cross the bounds of the enclosure. Provide answer in tabular form."
    const imagef = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("enclosure/front.png")).toString("base64"),
        mimeType:"image/png",
    },
    };
    
    const resultf = await model.generateContent([promptf,imagef]);
    fposn = resultf.response.text();
    }
    
    let fposl=""
    if(leftCutouts.length>0){
    const promptl = "Provided is the image of the left face of an enclosure with rectangular cutout . The left face dimensions are "+ l + "X"+ h + "Coordinate axes for the face is shown as well as the rectangle width and length has been labelled, Arrows show directions of width and length increase incase of rectangle.. Provide x,y coordinates for the starting points of the rectangular cutouts mentioned in the table shown. Strictly use array values without any change: \n "+ JSON.stringify(leftCutouts) +"access along with length and width along these lines . Ensure cutouts do not overlap and do not cross the bounds of the enclosure. Provide answer in tabular form."
    const imagel = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("enclosure/left.png")).toString("base64"),
        mimeType:"image/png",
    },
    };
    
    const resultl = await model.generateContent([promptl,imagel]);
    fposl = resultl.response.text();
    }        
    
    let fposr=""
    if(rightCutouts.length>0){
    const promptr = "Provided is the image of the right face of an enclosure with rectangular cutout . The left face dimensions are "+ l + "X"+ h + "Coordinate axes for the face is shown as well as the rectangle width and length has been labelled,Arrows show directions of width and length increase incase of rectangle.. Provide x,y coordinates for the starting points of the rectangular cutouts mentioned in the table shown. Strictly use array values without any change: \n "+ JSON.stringify(rightCutouts) +"access along with length and width along these lines . Ensure cutouts do not overlap and do not cross the bounds of the enclosure. Provide answer in tabular form."
    const imager = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("enclosure/right.png")).toString("base64"),
        mimeType:"image/png",
    },
    };
    
    const resultr = await model.generateContent([promptr,imager]);
    fposr = resultr.response.text();
    }          
    
    let fposu="";
    if(topCutouts.length>0){
    const promptu = "Provided is the image of the top face of an enclosure with rectangular cutout . The left face dimensions are "+ l + "X"+ b + "Coordinate axes for the face is shown as well as the rectangle width and length has been labelled,Arrows show directions of width and length increase incase of rectangle.. Provide x,y coordinates for the starting points of the rectangular cutouts mentioned in the table shown. Strictly use array values without any change: \n "+ JSON.stringify(topCutouts) +"access along with length and width along these lines . Ensure cutouts do not overlap and do not cross the bounds of the enclosure. Provide answer in tabular form."
    const imageu = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("enclosure/top.png")).toString("base64"),
        mimeType:"image/png",
    },
    };
    
    const resultu = await model.generateContent([promptu,imageu]);
    fposu = resultu.response.text();
    }
    
    let fposd="";
    if(bottomCutouts.length>0){
    const promptd = "Provided is the image of the bottom face of an enclosure with rectangular cutout . The left face dimensions are "+ l + "X"+ b + "Coordinate axes for the face is shown as well as the rectangle width and length has been labelled,Arrows show directions of width and length increase incase of rectangle.. Provide x,y coordinates for the starting points of the rectangular cutouts mentioned in the table shown. Strictly use array values without any change: \n "+ JSON.stringify(bottomCutouts) +"access along with length and width along these lines . Ensure cutouts do not overlap and do not cross the bounds of the enclosure. Provide answer in tabular form."
    const imaged = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("enclosure/bottom.png")).toString("base64"),
        mimeType:"image/png",
    },
    }; 
    
    const resultd = await model.generateContent([promptd,imaged]);
    fposd = resultd.response.text();
    }
    
    //final output check
    const finalP = "Task: Create an enclosure in the following json format(STRICTLY ADHERE TO THE JSON FORMAT AND DO NOT DEVIATE FROM IT. USE THE EXACT KEYS NO DEVIATION):\n"+json+"\n use the parameters as shown:\n1)For size use "+l+b+h+"as length width height of enclosure\n2)for bottom cutouts use"+fposd+"\n3)for top cutouts use"+fposu+"\n 4)for left cutouts use"+fposl+"\n 5)for right cutouts use"+fposr+"\n 6)for front cutouts use"+fposn+"\n for back cutouts use "+bposn+"\n for filling the locking and mount type fields use the data provided:"+lock_mount_type+"\nSTRICTLY USE THE DATA PROVIDED FOR CUTOUTS AND IF NO DATA IS PROVIDED DO NOT ADD CUTOUTS FOR THAT PARTICULAR SIDE. NO NEED FOR ANY EXTRA ASSUMPTIONS.DO NOT FILL null for custompcbdetails\nshape always 'rectangle' and pcbType always 'custom'";
    
    const finalres = await model.generateContent(finalP);
    const finalJSON=finalres.response.text();
    

    const cutoutJson=convertTableToJson(cutoutTable);
    console.log(cutoutJson);
    

   
        const jsonMatch = finalJSON.match(/{[\s\S]*}/);
        console.log(jsonMatch[0]);
        const errorless_json=validateConfig(jsonMatch[0]);
        console.log(errorless_json);

        const finalOutput = {
          response: errorless_json,
          cutoutJson: cutoutJson,
        };
        
        return finalOutput;
                    
      } 
     
    
   catch (error) {
    throw error;
  }
}



export default generateContent;