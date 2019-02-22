'use strict';

const ev = require('event-stream'),
    through = require('through2'),
    fs = require('fs'),
    _ = require('lodash')

const startStr = '#custom:start',
    endStr = '#custom:end';


function attachData(buffer, hosts) {
    buffer.push(startStr);
    hosts.forEach(function (host) {
        buffer.push(host.ip + ' ' + host.names.join(' '));
    });
    buffer.push(endStr);
}

exports.write = function (hosts) {
    let filepath = '/etc/hosts';
    let readStream = fs.createReadStream(filepath);
    let buffer = [];
    let isStart = new RegExp(startStr);
    let isEnd = new RegExp(endStr);
    let isComment = new RegExp('^#');
    let pos = 0;

    readStream.
    pipe(ev.split()).pipe(through(function (data, enc, next) {
        var line = data.toString().trim();

        if (isStart.test(line)) {
            pos = 1;
            readStream.hasStart = true;
        }

        if (isEnd.test(line)) {
            pos = 2;
            attachData(buffer, hosts);
            readStream.hasEnd = true;
        }

        if (!isStart.test(line) && !isEnd.test(line) && pos !== 1) {
            buffer.push(data);
        }

        next();
    }));

    readStream.on('end', function (data) {
        if (readStream.hasEnd !== true) {
            attachData(buffer, hosts);
        }
        fs.writeFile(filepath, buffer.join('\n'), () => {});
    });
};