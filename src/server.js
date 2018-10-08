#!/usr/bin/env node
var WebSocket = require("ws");


if ( process.argv.length <= 2 )
{
    console.log('Syntax: webserve <relay server listen port>')
}

else
{
    var port = parseInt(process.argv[2]);
    var servers = {}
    var connections = {}
    var bytes_relayed = 0;


    const wss = new WebSocket.Server({
        port: port,
        perMessageDeflate: {
            zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3,
            },

            zlibInflateOptions: {
            chunkSize: 10 * 1024
            },

            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
            serverMaxWindowBits: 10,      

            concurrencyLimit: 10,
            threshold: 1200,
        }
    });

    wss.on('connection', function _callback_connection(ws, req) {
        console.log(`Got connection from: ${req.connection.remoteAddress}`);

        var identified = null;
        var connectedTo = null;

        ws.on('message', function _callback_message(data) {
            if ( identified == null )
            {
                data = JSON.parse(data);
                identified = data['id'];

                if ( Object.keys(data).indexOf("connect") > -1 )
                {
                    if ( Object.keys(servers).indexOf(data['connect']) > -1 )
                    {
                        connectedTo = data['connect'];
                        connections[identified] = ws;

                        console.log(`Connection client ${identified} (${req.connection.remoteAddress}) connected to server ID: ${connectedTo}`);
                    }
                    
                    else
                    {
                        console.log(`Connection client ${identified} (${req.connection.remoteAddress}) attempted to connect to server ID: ${data['connect']}`);
                        
                        ws.close();
                    }
                }
                
                else
                {
                    if ( Object.keys(servers).indexOf(identified) > -1 )
                    {
                        console.log(`Server client ${req.connection.remoteAddress} tried to identify as taken name: ${identified}`)
                        
                        ws.close();
                    }
                    
                    else
                    {
                        servers[identified] = ws;
                        console.log(`Server client ${req.connection.remoteAddress} identified as: ${identified}`);
                    }
                }       
            }
            
            else if ( connectedTo != null )
            {
                if ( Object.keys(servers).indexOf(connectedTo) > -1 && servers[connectedTo] != null )
                {
                    var res_buf = Buffer.alloc(2 + identified.length + data.length);
                    
                    if ( servers[connectedTo].readyState != ws.CLOSED )
                    {
                        res_buf.writeUInt16LE(identified.length);
                        res_buf.write(identified, 2, 'utf-8');
                        res_buf = Buffer.concat([res_buf, data]);

                        bytes_relayed += data.length;

                        // console.log(`Relaying ${data.length} bytes. Direction: client ${identified} -> server ${connectedTo}`);
                        
                        servers[connectedTo].send(res_buf);
                    }
                    
                    else
                    {
                        console.log(`Killing connection client ${identified} for attempting connection with closed server ${connectedTo}.`);
                        ws.close();
                    }
                }

                else
                {
                    if ( ws.readyState == ws.CLOSED )
                        console.log(`Killing connection client ${identified} for attempting connection with dead server ${connectedTo}.`);

                    ws.close();
                }
            }

            else
            {
                var buf = new Buffer(data);

                let id_len = buf.readUInt16LE();
                let id = buf.slice(2, id_len + 2).toString('utf-8');
                let bin_data = buf.slice(id_len)

                bytes_relayed += bin_data.length;
                // console.log(`Relaying ${bin_data.length} bytes. Direction: server ${identified} -> client ${id}`);

                if ( Object.keys(connections).indexOf(id.toString('utf-8')) > -1 && connections[id.toString('utf-8')] != null )
                    connections[id.toString('utf-8')].send(bin_data);
            }
        })

        ws.on('close', function (_, code, reason) {
            if ( connectedTo != null )
            {
                console.log(`Connection client ${identified} died!`);

                if ( connections[connectedTo] != null )
                    connections[identified] = undefined;
            }

            else
            {
                console.log(`Server client ${identified} died!`);

                servers[identified] = undefined;
                connections[identified] = undefined;
            }
        })
    })

    console.log(`Listening on port: ${port}`)

    setInterval(function() {
        console.log(`All bytes relayed: ${bytes_relayed}`);
    }, 20000);
}