#!/usr/bin/env node
const WebSocket = require('ws');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

const common_words = fs.readFileSync(path.join(__dirname, 'commonwords.txt'), 'utf-8').split('\r\n');

if ( process.argv.length <= 4 )
{
    console.log('Syntax: webrelay <local (outlet) listen port> <remote relay address> <ID of server to connect to through relay>')
}

else
{
    const listen_port = parseInt(process.argv[2]);
    const remote_addr = process.argv[3];
    const server_id = process.argv[4];
    const client_id = Array.from([1, 2, 3, 4], () => common_words[Math.floor(Math.random() * common_words.length)]).join('-');
    
    const ws = new WebSocket(remote_addr);

    var last_port = null;
    
    ws.on('open', function _callback_open() {
        const uplink = dgram.createSocket('udp4');

        ws.send(JSON.stringify({
            id: client_id,
            connect: server_id
        }));

        console.log('Websocket connected to remote UDP relay server.');
        // console.log(`ID: ${client_id}`);

        ws.on('message', function _callback_message(data) {
            if ( last_port != null )
            {
                uplink.send(data, last_port, 'localhost');
            }

            else
                console.log(`WARNING: No known port found for server->client data!`)
        });

        uplink.on('message', function _callback_server_message(msg, rinfo) {
            last_port = rinfo.port;
            ws.send(msg);
        });

        uplink.bind(listen_port);
    });
}