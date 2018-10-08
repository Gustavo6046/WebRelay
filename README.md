# WSocketRelay

WSocketRelay is a Websocket-based UDP tunnel toolkit. It contains:

* A server: the script you will run to host a relay server;
* An exposer: use this to expose YOUR server (aka user server)
  to the aforementioned server;
* A client: use this to connect to YOUR (or someone else's) user
  server through the relay server.

It is capable of relaying multiple user servers with only a single
relay server.

# How to Use?

This is usually needed when you want to use a secure Websocket tunnel
to break through a firewall or NAT, or similar circumstances. Otherwise,
why not just send your user server's IP to someone else?

1) Host your user server.
2) Either:
 
 * Host the relay server yourself (using ngrok to expose it, if necessary):

```
wsrserve <listen port>
```

 * Ask someone else to do it for you, while linking them to this page.

3) Host your exposer, to relay your user server from and to the relay server:

```
wsrexpose <minimum local client port number (see below)> <relay server address> <your user server's listen port>
```

4) The exposer will print out the __Server ID__ to the console. Make sure to send that
to whoever are your clients!

5) Have your clients get WSocketRelay, so they can connect its WSocketRelay client to the
user server through the new relay server:

```
wsrconnect <local listen port> <relay server address> <your Server ID>
```

6) Have your clients point their client software to their own localhost, at the local
listen port.

7) ???

8) Profit!

## What is a "local client"?

UDP usually doesn't establish connections; it just throws packets around, with the UDP
header, which, unimportant internal details aside, contains the source address and port.

Here, the exposer **MUST** make a different UDP socket, in a different port, for every
client that connects to it, so that the server software can discern from each client,
using only the port in the UDP packets' headers.

# Attention

It was designed specifically for use with the first generation of
the Unreal Engine (most specifically, the 1999 spawn of Unreal
Tournament), though it doesn't work, due to a mysterious memory
error in the game's side.