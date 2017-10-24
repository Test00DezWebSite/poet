# Po.et Node

Po.et is a subjective trust engine used for copyright management.

## Getting Started
To run a Po.et node in your local machine:
1. Install `docker` and `docker-compose`
2. Configure everything
3. Build the system running `sudo make development` on Ubuntu or just `make development` in macOS
4. Start the system running `sudo make daemon` on Ubuntu or just `make development` in macOS
5. Open a web browser to `localhost:3000` 

## Configuration
The Po.et Node can be configured via configuration files.
The individual services accept a `-c <path to configuration file` command-line argument, and the docker files pick these up from `node/configuration`.

Example configuration files can be found under `node/config/*.json.example`. Most of these will Just Work™, and the Po.et Node has sensible defaults, so you can just `cd /node/config && cp explorer.json.example explorer.json`, etc., for the most part.

> Note: although Po.et has defaults for all configurations, the configuration files _must_ exist, even if they only have an empty json object inside. This will be fixed in the future.

There's only one service you _need_ to configure manually: Trusted Publisher. This is what Trusted Publisher's configuration looks like:

```json
{
  "bitcoinAddress": "",
  "bitcoinAddressPrivateKey": "",
  "notaryPrivateKey": "",
  "poetNetwork": "BARD",
  "poetVersion": [0, 0, 0, 2]
}
```

`bitcoinAddress` is the address of a bitcoin wallet you control and `bitcoinAddressPrivateKey` is its matching private key. Bitcoin transactions broadcasted by Po.et will come from this address and use its funds to pay transaction fees. See [our wiki](https://github.com/poetapp/poet/wiki/How-to-Create-a-Wallet) for info on how to create a wallet.

`notaryPrivateKey` is the private key Trusted Publisher will use to sign some claims. It's unrelated to bitcoin and can be any value. For testing purposes, you can use any random number. In the future it may be removed entirely.

We'll talk about `poetNetwork` and `poetVersion` in the following section.

### Configuring Po.et Network and Version

Since Po.et is completely decentralized, we can't really talk about production and testing _servers_ - we need production and testing _networks_.
  
Po.et offers two different networks: `POET` acts as Po.et's mainnet or "production", while `BARD` acts as Po.et's testnet or "testing environment".

`poetVersion` could be used in the future to alter the data structures without breaking compatibility.

These can be configured in Trusted Publisher's and Bitcoin Scanner's configuration files.

If left out, they'll default to `BARD` and `[0, 0, 0, 2]`.

If you're going to try out the Po.et Node, please make sure to use BARD rather than POET.
  

## Architecture

A Po.et Node is made up of several microservices that communicate with each other using RabbitMQ.

#### explorer-api

This API is mainly read-only, and allows you to search and retrieve works, licences, profiles, etc.

All this information is read from the Postrgres database, which is fed by claims-to-db.

[poet-js](https://github.com/poetapp/poet-js) has a client for this API with Typescript definitions.

Runs on `/api/explorer`. For example: `http://localhost:3000/api/explorer/works`.

> The url `/api/explorer` is currently configured in the frontend's webpack [devServer](https://github.com/poetapp/poet/blob/master/web/devServer.js#L22). It will be moved in the future.

#### trusted-publisher

Runs the REST API on which claims can be posted.

This system performs the following steps:

- Performing validations on the submitted claims
- Creates new claims on memory based on the submitted claims (for example, Title of Ownership claims for submitted Work claims)
- Bundles the submitted claims and created claims into a block
- Calculates the hash of this block and timestampts it to the blockchain
- Publishes a `SEND_BLOCK` message to RabbitMQ, serializing the entire block into the message. This message is consumed by torrent-system, which seeds this block, and claims-to-db, which stores the claims in the block to the postgres database that is read by explorer-api.

Runs on `/api/user`. See [poet-feed-consumer](https://github.com/poetapp/feed-consumer) and [poet-feeds](https://github.com/poetapp/feeds) for examples on how to submit claims.

> The url `/api/user` is currently configured in the frontend's webpack [devServer](https://github.com/poetapp/poet/blob/master/web/devServer.js#L30). It will be moved in the future.

#### claims-to-db

Processes all claims and stores them in the database.

> TODO: Split "trusted" and "untrusted" claims

#### auth-server

Runs an authentication server that communicates with poet-web and the mobile Authenticator apps.

#### bitcoin-scanner

Hooks to the bitcoin blockchain and notifies of new transactions and blocks.

#### torrent-system

Receive orders to download new claim blocks and notifies when torrents are finished downloading.

#### mock-signer

Development mode only. Used by the frontend to simulates a QR code scan by the app whenever a click on a QR is made.

Allows testing both poet-node and poet-web without having to scan QR codes with the Authenticator.
