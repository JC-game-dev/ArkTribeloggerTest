const { readFile } = require("fs").promises;
const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require('child_process');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const sharp = require('sharp');

const Tesseract = require('tesseract.js');

const axios = require('axios');

const storedConnections = [];

const items = [];

let curLinks = [];

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

const imagePath = "live.png";


const webhook = "https://discord.com/api/webhooks/1166303267316310106/At-bdvAUP_smQrUedRcw4LZ__rwYt3UgRDUvouPgqL3QXzoq1Y0pj2gR_588nClzatoI";

app.get("/", async (request, response) => {
    response.send(await readFile("./index.html", "utf8"));
});

app.post('/submit-form', (req, res) => {
    const streamLink = req.body.streamLinkInput;
    let active = true;

    console.log(req);

    if(!req.body.type) {
        res.send("No Values Defined");
    }

    console.log("length" + req.body.type.length);

    const types = req.body.type;
    const destroyedOptions = req.body.destroyedoptions;
    const destroyedAmounts = req.body.destroyedamount;
    const dinoNames = req.body.dinoName;
    const killedAmounts = req.body.killedAmount;

    console.log(types[0])

    let formItems = {
        types,
        destroyedOptions,
        destroyedAmounts,
        dinoNames,
        killedAmounts,

    };


    console.log('Items:', formItems);

    console.log(formItems.types[0]); //single items have to be handled differently?

    for (let i = 0; i < formItems.types.length; i++) {
        const type = formItems.types[i];

        if(type == "wasKilled") {
            const dinoName = formItems.dinoNames[i];
            let amount = formItems.killedAmounts[i];

            if(amount == "") {
                amount = "1";
            }

            const stringTLF = "Your " + dinoName + ".*" + "was killed by " + ".*";

            if(dinoName !== "") {
                items.push({
                    stringTLF,
                    amount
                })
            }
        }
        else if(type == "wasDestroyed") {
            const destroyedOption = formItems.destroyedOptions[i];
            let amount = formItems.destroyedAmounts[i];

            if(amount == "") {
                amount = "1";
            }

            const stringTLF = "destroyed your '" + destroyedOption;

            if(destroyedOption != "") {
                items.push({
                    stringTLF,
                    amount
                })
            }
        }


    }

    console.log(items);

    // Now, you can use 'platform', 'streamLink', 'type', 'webhook', and 'items' as needed

    processStreamLink(streamLink);
    res.send('Data received successfully');
});


app.listen(process.env.PORT || 8080, () => console.log("App available on http://localhost:8080"));

async function getHLSUrl(url) {
    try {
        const info = await ytdl.getBasicInfo(url);

        return info.player_response.streamingData.hlsManifestUrl;
    } catch (err) {
        console.error('Error fetching video info:', err);
        throw err; // You may choose to throw the error to handle it elsewhere
    }
}

async function processStreamLink(url, webhook = null) {
    let HLSUrl = await getHLSUrl(url);

    captureFramesFromHLS(HLSUrl);
}

async function captureFramesFromHLS(hlsUrl) {
    const captureInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    let frameNumber = 0;


    function captureFrame() {
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');

        const buffers = [];

        const ffmpegCommand = ffmpeg(hlsUrl)
            .seekInput('00:00:00') // Capture the frame at the current time
            .frames(1) // Capture a single frame
            .toFormat('image2')
            .on('end', (stdout) => {
                console.log(`Frame captured at ${timestamp}`);
                frameNumber++;

                // Concatenate the buffers to get the frame data
                const frameBuffer = Buffer.concat(buffers);

                // Pass the frame data to the callback function
                tesseractProcess(frameBuffer);

                // Schedule the next frame capture
                setTimeout(captureFrame, captureInterval);
            })
            .on('error', (err) => {
                console.error('Error capturing frame:', err);

                // Retry the frame capture after a delay
                setTimeout(captureFrame, captureInterval);
            });

        // Pipe the frame data to the buffer
        ffmpegCommand.pipe(null, { end: true }).on('data', (data) => {
            buffers.push(data);
        });
    }

    // Start capturing frames
    captureFrame();
}


async function tesseractProcess(imgData) {
    let text = await extractTextFromImage(imgData)
        .then((text) => {
            console.log('Extracted text:', text);
            return text;
        })
        .catch((error) => {
            console.error('Text extraction error:', error);
        });

    checkTextForItemOverlaps(text);
}

function cleanUpText(text) {
    return text.replace(/\n/g, ' ');
}

function checkTextForItemOverlaps(text) {
    console.log(items); // Verify the contents of the 'items' array
    console.log(text); // Verify the extracted text

    let newText = cleanUpText(text);

    console.log(newText);

    for (let i = 0; i < items.length; i++) {
        const curItem = items[i];
        const regex = new RegExp(curItem.stringTLF, 'g');
        const matches = text.match(regex);

        if(matches) {
            if(matches.length == curItem.amount) {
                sendWebhookMessage(`ALERT - Occurrences of '${curItem.stringTLF}': ${matches.length}`);
            }
        }
    }
}

async function extractTextFromImage(imageData) {
    try {
        const { data } = await Tesseract.recognize(imageData, 'eng', {
            logger: (m) => console.log(m), // Optional: Set a logger for debug information
        });

        // Extracted text is available in the 'data.text' property
        const extractedText = data.text;

        return extractedText;
    } catch (error) {
        console.error('Error extracting text from image:', error);
        throw error;
    }
}

async function sendWebhookMessage(content) {
    try {
        // Use the <@USER_ID> format to mention the user
        const contentWithMention = `<@812370737108615189> ${content}`;

        const response = await axios.post(webhook, {
            content: contentWithMention,
        });

        console.log(`Message sent. Status: ${response.status}`);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
