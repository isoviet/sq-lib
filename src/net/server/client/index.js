//  Module:     src/net/server/client
//  Project:    sq-lib
//  Author:     soviet
//  E-mail:     soviet@s0viet.ru
//  Web:        https://s0viet.ru/

const net = require('net')
const EventEmitter2 = require('eventemitter2')

const { Logger } = require('@sq-lib/src/utils/logger')
const { Dissector } = require('@sq-lib/src/net/protocol/dissector')
const { PacketClient, PacketServer } = require('@sq-lib/src/net/protocol')

class ServerClient extends EventEmitter2 {
	constructor(options, socket) {
		super({wildcard: true})
		this.options = options
		this.socket = socket
		this.dissector = new Dissector()
		this.listenTo(this.socket, {
			close: 'client.close',
			connect: 'client.connect',
			data: 'client.data',
			drain: 'client.drain',
			end: 'client.end',
			error: 'client.error',
			lookup: 'client.lookup',
			ready: 'client.ready',
			timeout: 'client.timeout'
		})
		this.socket.setTimeout(this.options.timeout || 45000)
	}
	open() {
		Logger.debug('net', 'ServerClient.open')
		this.socket.on('data', (chunk) => this.ondata(chunk))
		this.socket.resume()
	}
	close() {
		Logger.debug('net', 'ServerClient.close')
		this.socket.destroy()
	}
	ondata(chunk) {
		Logger.debug('net', 'ServerClient.ondata')
		let result
		try {
			result = this.dissector.read(chunk)
		} catch(error) {
			return this.close(error)
		}
		let packet
		try {
			packet = PacketClient.from(result.buffer)
		} catch(error) {
			return this.close(error)
		}
		this.emit('packet.incoming', packet, result.buffer)
		if(result.remainder !== undefined)
			this.ondata(result.remainder)
	}
	sendPacket(type, data) {
		Logger.debug('net', 'ServerClient.sendPacket')
		let packet = new PacketServer(type, data)
		this.sendData(packet)
	}
	sendData(packet) {
		Logger.debug('net', 'ServerClient.sendData')
		let buffer = packet.toBuffer()
		this.socket.write(buffer, () => this.emit('packet.outcoming', packet, buffer))
	}
}

module.exports = {
	ServerClient: ServerClient
}