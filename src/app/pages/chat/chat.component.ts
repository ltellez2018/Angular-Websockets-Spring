import { Component, OnInit } from '@angular/core';
import { Client } from "@stomp/stompjs";
import * as SockJS from 'sockjs-client'
import { Mensaje } from '../../models/mensaje';
import { ThrowStmt } from '@angular/compiler';


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client: Client;
  conectado: boolean = false;
  mensaje: Mensaje = new Mensaje();
  mesanjes: Mensaje[] = [];
  escribiendo: string;
  clienteId: string;

  constructor() { 
    this.clienteId = 'id-'+ new Date().getTime() + '-' + Math.random().toString(36).substr(2);  
  }

  ngOnInit() {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS("http://localhost:8080/chat-websocket"); //* Conexion al broker [End Point]
    }

    //* ESCUCHAR CONEXION
    this.client.onConnect = (frame) => {
        console.log('Conectados: ' + this.client.connected + ' : ' + frame);        
        this.conectado = true;

        //* Susbscription al evento del chat [subscription, listening]
        this.client.subscribe('/chat/mensaje',event => {
            let mensaje: Mensaje = JSON.parse(event.body) as Mensaje;
            mensaje.fecha = new Date(mensaje.fecha);
            //* SOLO AL NUEVO CLIENTE
            if(!this.mensaje.color &&  mensaje.tipo == 'NUEVO_USUARIO' 
                && this.mensaje.username ==  mensaje.username){
                  this.mensaje.color = mensaje.color;
            }
            this.mesanjes.push(mensaje);
            console.log('Mensaje', mensaje);            
        });


        this.client.subscribe('/chat/escribiendo',event => {
            this.escribiendo = event.body;  
            setTimeout(() => {
              this.escribiendo = '';
            }, 3000);
        });

        this.client.subscribe('/chat/historial/' + this.clienteId, 
            e => {
                  const historial = JSON.parse(e.body) as Mensaje [];
                  this.mesanjes = historial.map(m => {
                    m.fecha = new Date(m.fecha);
                    return m;
                  }).reverse();
            });

        this.client.publish({ destination: '/app/historial', body: this.clienteId });
        this.mensaje.tipo = 'NUEVO_USUARIO';
        this.client.publish({ destination: '/app/mensaje', body: JSON.stringify(this.mensaje) });
    };

    //* ESCUCHAR DESCONEXION
    this.client.onDisconnect = (frame) => {
        console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);        
        this.conectado = false;
        this.mensaje = new Mensaje();
        this.mesanjes = [];
    };
    
    
  }

  conectar(): void {
    console.log('Conectando...');
    
    //* CONEXION
    this.client.activate();
  }
  desconectar() : void {
    console.log('Desconectando...');
    //* DESCONEXION
    this.client.deactivate();
  }


  enviarMensaje(): void {   
    this.mensaje.tipo = 'MENSAJE';
    console.log(JSON.stringify(this.mensaje));    
    this.client.publish({ destination: '/app/mensaje', body: JSON.stringify(this.mensaje) });
    //* REINICIO DL TEXTO
    this.mensaje.texto = '';
  }


  escribiendoEvento():void{
    this.client.publish({ destination: '/app/escribiendo', body: JSON.stringify(this.mensaje.username) });
  }
}
