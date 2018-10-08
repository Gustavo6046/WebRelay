#!/usr/bin/env node
const WebSocket = require('ws');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

const common_words = fs.readFileSync(path.join(__dirname, 'commonwords.txt'), 'utf-8').split('\r\n');

if ( process.argv.length <= 4 )
{
    console.log('Syntax: wsrexpose <min listen port> <remote address> <desired server (to expose) port> [desired Server ID (defaults to English random)]')
}

else
{
    const remote_addr = process.argv[3];
    const server_port = parseInt(process.argv[4]);
    const desired_id = (
        process.argv.length > 5
        ? process.argv[5]
        : Array.from([1, 2, 3, 4], () => common_words[Math.floor(Math.random() * common_words.length)]).join('-')
    );

    const ws = new WebSocket(remote_addr);


    ws.on('open', function _callback_open() {
        console.log('Websocket connected to remote UDP relay server.');
        console.log(`Server ID: ${desired_id}`);
        
        ws.send(JSON.stringify({
            id: desired_id
        }));

        const min_port = parseInt(process.argv[2]);
        const connections = {};

        var port_indices = [];
        
        ws.on('close', function _callback_close() {
            for ( conn in Object.keys() )
                connections[conn].close();
        })

        function makeServerRelay(id)
        {
            var server = dgram.createSocket('udp4');
            var port = null;
            
            server.on('error', function _callback_error(err) {
                console.log(`Local UDP uplink socket on port ${port} for client ${id} error:\n${err.stack}`);
                ws.close();
            });
            
            server.on('listening', function _callback_listening() {
                console.log(`Local UDP uplink socket listening on port ${port} for client ${id}.`);

                server.on('message', (msg, rinfo) => {
                    var res_buf = Buffer.alloc(2 + id.length + msg.length);

                    res_buf.writeUInt16LE(id.length);
                    res_buf.write(id, 2, 'utf-8');
                    res_buf = Buffer.concat([res_buf, msg]);

                    ws.send(res_buf);
                });
            });

            for ( var i = min_port; port_indices.indexOf(i) > -1; i++ );

            port = i;

            server.bind(i);
            port_indices.push(i);


            return server;
        }

        ws.on('message', function _callback_message(data) {
            var buf = new Buffer(data);

            let id_len = buf.readUInt16LE();
            let other_id = buf.slice(2, id_len + 2).toString('utf-8');
            let bin_data = buf.slice(id_len);

            if ( Object.keys(connections).indexOf(other_id) == -1 )
                connections[other_id] = makeServerRelay(other_id);

            connections[other_id].send(bin_data, server_port, 'localhost');
        });
    });
}