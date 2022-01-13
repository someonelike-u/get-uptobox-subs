// ==UserScript==
// @name         Downloader Uptobox subs
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  For someone who wants just the subs in a video
// @author       asH
// @match        https://uptobox.com/*
// @grant       GM_xmlhttpRequest
// ==/UserScript==

if (!document.documentElement.outerHTML.includes(location.href.replace('uptobox', 'uptostream'))) {
    return;
}

// To set if you want a specific language
const lang = ['fre', 'fra'];
const url = location.href.replace('uptobox', 'uptostream');
const title = document.getElementsByTagName('title')[0].textContent.replace('.mkv', '');

GM_xmlhttpRequest({
    method: 'GET',
    url: url,
    onload: response => {
        const link = document.createElement('a');
        link.innerHTML = 'DDL SUBS FR';
        const contentHTML = response.responseText;
        const getBeginJsonSubs = contentHTML.split('var assSubs = JSON.parse(\'')[1];
        const getVTTpart = contentHTML.split('kind=\'subtitles\' src=\'')[1];
        const finalJsonSubs = getBeginJsonSubs ? JSON.parse(getBeginJsonSubs.split('\');')[0]) : null;
        let finalVTTSubs = null;

        if (getVTTpart) {
            const VTTSubs = contentHTML.split('\n').filter(line => line.includes('type=\'vtt\''));
            finalVTTSubs = findSubsInVTTList(VTTSubs);
        }
        let subsLink = null;
        if ((finalJsonSubs && finalJsonSubs.length > 0) || finalVTTSubs) {
            if (finalJsonSubs && finalJsonSubs.length > 0) {
                subsLink = findSubsInAssList(finalJsonSubs);
            }
            subsLink = subsLink ? subsLink : finalVTTSubs;
            link.onclick = () => {
                downloadSubs(subsLink);
            };
            addSubsButton(link);
        } else {
            const token = JSON.parse(document.querySelectorAll('[data-ui]')[0].dataset.ui).token;
            const file_code = JSON.parse(document.querySelectorAll('[data-ui]')[0].dataset.ui).file_code;
            const videoURL = 'https://uptostream.com/api/streaming/source/get?token=' + token + '&file_code=' + file_code + '&hls=1';
            let subsLink = null;

            link.onclick = () => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: videoURL,
                    responseType: 'json',
                    onload: response => {
                        console.log('Trying new method...');
                        var sourcesAndTracks = null;
                        const codeToExecute = JSON.parse(response.responseText).data.sources;

                        /*eslint-disable no-eval */
                        eval(codeToExecute);
                        subsLink = findSubsInAssList(sourcesAndTracks.tracks);
                        downloadSubs(subsLink);
                    },
                    onerror: error => {
                        console.log('Error: ' + error);
                    }
                });
            };
            addSubsButton(link);
        }
    },
    onerror: error => {
        console.log('Error: ' + error);
    }
});

function addSubsButton(link) {
    link.id = 'ass';
    link.style.display = 'flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.color = 'blue';
    link.style.cursor = 'pointer';
    link.style.textDecoration = 'underline';
    link.addEventListener('mouseover', event => {
        event.target.style.color = "red";
    }, false);
    link.addEventListener('mouseout', event => {
        event.target.style.color = "blue";
    }, false);

    const icon = document.createElement('img');
    icon.src = 'https://pic.clubic.com/v1/images/1501465/raw.webp?fit=smartCrop&width=90&height=90&hash=33c165b0b5a66f859e5acf934b3ff0444d0c138d';
    icon.id = 'icon-ass';
    icon.style.width = '30px';
    icon.style.height = '30px';
    icon.style.marginLeft = '10px';
    link.appendChild(icon);
    const titleTag = document.getElementsByClassName('file-title')[0];
    if (titleTag) {
        titleTag.after(link);
    }
}

function findSubsInAssList(finalJsonSubs) {
    let subsLink = null;
    finalJsonSubs.some(subs => {
        if ((subs.srclang && lang.includes(subs.srclang)) ||
            (subs.srcLang && lang.includes(subs.srcLang)) ||
            lang.includes(subs.label.toLowerCase().substring(0, 3))
           ) {
            subsLink = subs.src;
            return true;
        }
        return false;
    });
    return subsLink ? subsLink : finalJsonSubs[0].src;
}

function findSubsInVTTList(VTTSubs) {
    let subsLink = null;
    if (VTTSubs.length === 1 ) {
        const beginSubsLink = VTTSubs[0].split('src=\'')[1];
        return beginSubsLink.split('\'')[0];
    }

    VTTSubs.some((subs, index) => {
        if (index === 0) {
            const beginSubsLink = subs.split('src=\'')[1];
            subsLink = beginSubsLink.split('\'')[0];
        }
        if (!subs.toLowerCase().includes('force')) {
            if (
                lang.includes(subs.toLowerCase().split('srclang=\'')[1].substring(0, 3)) ||
                lang.includes(subs.toLowerCase().split('srcLang=\'')[1].substring(0, 3)) ||
                lang.includes(subs.toLowerCase().split('label=\'')[1].substring(0, 3))
               ) {
                const beginSubsLink = subs.split('src=\'')[1];
                subsLink = beginSubsLink.split('\'')[0];
                return true;
            }
        }
        return false;
    });
    return subsLink;
}

function downloadSubs(subsLink) {
    if (subsLink.includes('.vtt')) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: subsLink,
            responseType: 'text',
            onload: response => {
                const contentSubs = response.responseText.replace('WEBVTT\n\n', '');
                const lines = contentSubs.split('\n');
                let SRTSubs = '';
                let lineNumber = 1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('-->')) {
                        let currentLine = lines[i].replace(/\./g,',');
                        const timeFormat = currentLine.split(' --> ');
                        let finalNewFormat = '';
                        if (timeFormat[0].length < 12) {
                            finalNewFormat = '00:' + timeFormat[0] + ' --> ';
                            if (timeFormat[1].length < 12) {
                                finalNewFormat = finalNewFormat + '00:' + timeFormat[1];
                            } else {
                                finalNewFormat = finalNewFormat + timeFormat[1];
                            }
                            SRTSubs = SRTSubs + lineNumber + '\n' + finalNewFormat + '\n';
                        } else {
                            SRTSubs = SRTSubs + lineNumber + '\n' + currentLine + '\n';
                        }
                        lineNumber++;
                    } else {
                        SRTSubs += lines[i] + '\n';
                    }
                }
                const a = document.createElement('a');
                const url = window.URL.createObjectURL(new Blob([SRTSubs]));
                a.href = url;
                a.download = title + '.srt';
                a.click();
            },
            onerror: error => {
                console.log('Error: ' + error);
            }
        });
    } else {
        GM_xmlhttpRequest({
            method: 'GET',
            url: subsLink,
            responseType: 'blob',
            onload: response => {
                const contentSubs = response.response;
                const a = document.createElement('a');
                const url = window.URL.createObjectURL(contentSubs);
                a.href = url;
                a.download = title + '.ass';
                a.click();
            },
            onerror: error => {
                console.log('Error: ' + error);
            }
        });
    }
}
