import { IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { Component, ElementRef, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, LoadingController, PopoverController, AlertController } from '@ionic/angular';
import PanZoom, { PanzoomObject } from '@panzoom/panzoom';
import { GeneralServices } from "../../../service/general-services.service";
import { ModalVisualizarComponent } from 'src/app/components/modals/modal-visualizar/modal-visualizar.component';
import { NgPipesModule } from 'ngx-pipes';
import { ServiciosFuncionesRecurrentesService } from 'src/app/service/servicios-funciones-recurrentes.service';
import { ModalAlertaComponent } from 'src/app/components/modals/modal-alerta/modal-alerta.component';
import { AuthService } from 'src/app/service/AuthService/auth.service';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonSelect,
    IonSelectOption,
    NgPipesModule
  ],
  providers: [ServiciosFuncionesRecurrentesService]
})
export class MapaPage implements OnInit {

  @Input() dentroModal: boolean = false;
  @Output()
  @ViewChild('contenedorSVG') contenedorSVG!: ElementRef;

  listaProyectos: any = [];
  masterPlan: any = null;

  funcionNuevo: any = null;
  funcionVender: any = null;
  funcionApagado: any = null;

  loteIdActual: any;
  listaIndicadores: any = [];
  indicadoresLotes: any = [
    {
      "nombre_tipo_estatus": "Residencial",
      "color_tipo_estatus": "#e0d3b3",
      "visible_tipo_estatus": "1"
    },
    {
      "nombre_tipo_estatus": "Mixto",
      "color_tipo_estatus": "#6e76b7",
      "visible_tipo_estatus": "1"
    },
    {
      "nombre_tipo_estatus": "Comercial",
      "color_tipo_estatus": "#fed175",
      "visible_tipo_estatus": "1"
    }
  ]
  listaFormasPago: any;
  listaLotes: any;
  panzoomControl!: PanzoomObject;

  proyectoId: string = "";
  masterPlanId: string = "";

  mousePosition = {
    positionX: 0,
    positionY: 0,
  };

  touchPosition = {
    positionX: 0,
    positionY: 0,
  };

  data: any;

  private panzoomEscalaCoordenadas: any = {
    "escala": 1,
    "coordenadas": {
      x: 0,
      y: 0
    }
  }

  constructor(
    private generalServices: GeneralServices,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private funcionesRecurrentes: ServiciosFuncionesRecurrentesService,
    private authService: AuthService
  ) { }

  ionViewWillEnter() {
    if (!this.dentroModal) {
      this.funcionesRecurrentes.showLoading('Cargando...')
      this.obtenerProyectos();
      this.obtenerListaIndicadores();
    }
  }

  ionViewWillLeave() {
    this.contenedorSVG.nativeElement.replaceChildren();
    this.proyectoId = ''
    this.masterPlanId = ''
    this.mousePosition = {
      positionX: 0,
      positionY: 0,
    };

    this.touchPosition = {
      positionX: 0,
      positionY: 0,
    };
  }

  ngOnInit() {
    if (this.dentroModal) {
      this.funcionesRecurrentes.showLoading('Cargando...')
      this.obtenerProyectos();
      this.obtenerListaIndicadores();
    }
  }

  // ---------------------------------------------------------------
  // Servicios

  obtenerProyectos() {
    this.generalServices.get("proyecto").subscribe((response) => {
      if (response) {
        this.listaProyectos = response.filter((proyecto: any) => {
          if (proyecto["estatus_proyecto"] == 1) {
            const date = new Date();
            const fechaInicio = new Date(proyecto["fecha_inicio_operacion"]);
            const fechaHoy = new Date(date);
            if (fechaHoy.getTime() >= fechaInicio.getTime()) {
              return proyecto
            }
          }
        });
      }
      if (this.listaProyectos.length == 1) {
        this.proyectoId = this.listaProyectos[0].id_proyecto;
        this.obtenerMasterPlans(this.proyectoId);
        this.obtenerFormasDePago(this.proyectoId);
      }
    })
  }

  obtenerMasterPlans(proyectoId: string) {
    this.generalServices.get(`visualizador/obtenermasterplans/${proyectoId}`).subscribe({
      next: (response: any) => {
        if (response) {
          this.masterPlan = response[0];
          this.masterPlanId = this.masterPlan.id_master_plan
          this.obtenerListaLotes(this.masterPlanId);
        }
      },
      error: (error: any) => {
        this.funcionesRecurrentes.dismissLoading();
        this.modalCtrl.create({
          component: ModalAlertaComponent,
          componentProps: {
            titulo: 'Error con los archivos',
            texto: 'Por favor, suba los archivos requeridos.'
          },
          cssClass: "modal-auto",
          backdropDismiss: false
        });
        /* this.loadingCtrl.create({
          message: `El proyecto no cuenta con master plan.`,
          duration: 1500,
        }).then((response: any) => response.present()); */
      },
      complete: () => {
        this.funcionesRecurrentes.dismissLoading();
      }
    });
  }

  obtenerListaIndicadores() {
    this.generalServices.get(`tipoestatuslote`).subscribe((response) => {
      if (response) {
        this.listaIndicadores = [
          ...this.indicadoresLotes,
          ...response
        ]
      }
    });
  }

  obtenerFormasDePago(proyectoId: string) {
    this.generalServices.get(`formaspagos/proyecto/${proyectoId}/${0}`).subscribe((response) => {
      if (response) {
        this.listaFormasPago = response;
      }
    });
  }

  obtenerListaLotes(masterPlanId: string) {
    this.generalServices.get(`masterplanlote/lotes/${masterPlanId}`).subscribe((response) => {
      if (response) {
        this.listaLotes = response;
        if (this.contenedorSVG) {
          this.generalServices.get(`masterplans/obtenersvg/${masterPlanId}`).subscribe((response) => {
            const masterPlanJSON: any = response;
            if (masterPlanJSON['svgString']) {
              const masterPlan = masterPlanJSON['svgString'];
              const domParser = new DOMParser();
              const svgElement = domParser.parseFromString(
                masterPlan,
                'image/svg+xml'
              ).documentElement;
              const lotes = svgElement.querySelectorAll('[lote-uuid]');
              if (lotes) {
                lotes.forEach((lote) => {
                  const loteUUID = lote.attributes.getNamedItem('lote-uuid')!.value;
                  const loteActual = this.obtenerLote(loteUUID);

                  if (loteActual) {
                    (lote as HTMLElement).style.fill = this.obtenerEstadoLote(loteActual);
                    lote.addEventListener('mousedown', (event) => {
                      this.mousePosition.positionX = (event as MouseEvent).screenX;
                      this.mousePosition.positionY = (event as MouseEvent).screenY;
                    });
                    if (this.authService.havePermission('Masterplan', 'Ver todo')) {
                      if (loteActual.idRel_tipo_estatus != 3 && loteActual.idRel_tipo_estatus != 4) {
                        lote.addEventListener('mouseover', (event) => {
                          const loteEnontrado = this.obtenerLote(loteUUID);

                          if ((loteEnontrado.idRel_tipo_estatus != 5 && loteEnontrado.idRel_tipo_estatus != 4) || this.authService.havePermission('Masterplan', 'Ver todo')) {
                            const lote = event.target as HTMLElement;
                            lote.style.cursor = "pointer";
                            lote.style.fill = "rgba(255, 255, 255, 0.5)";
                          }
                        });

                        lote.addEventListener('mouseout', (event) => {
                          const loteElement = event.target as HTMLElement;
                          loteElement.style.fill = this.obtenerEstadoLote(loteActual);
                        });


                        lote.addEventListener('click', async (event) => {
                          if (
                            this.mousePosition.positionX === (event as MouseEvent).screenX &&
                            this.mousePosition.positionY === (event as MouseEvent).screenY
                          ) {
                            this.obtenerEscalaYCoordenadas();
                            const lote = this.obtenerLote(loteUUID);
                            if (lote) {
                              if (lote.estatus_lote == 1 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                                if (lote.idRel_tipo_estatus != 5 && lote.idRel_tipo_estatus != 4 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                                  console.log("Mapa page", this.dentroModal);

                                  const modal = await this.modalCtrl.create({
                                    component: ModalVisualizarComponent,
                                    cssClass: 'modal-visualizar',
                                    componentProps: {
                                      data: { ...{ 'id_proyecto': this.proyectoId }, ...lote },
                                      dentroModal: this.dentroModal,
                                      interesadoDentroModal: this.data
                                    },
                                    backdropDismiss: false,
                                  });
                                  modal.present();
                                  modal.onDidDismiss().then((data: any) => {
                                    if (data.role === "seleccionado") {
                                      this.modalCtrl.dismiss(data.data, 'seleccionado');
                                    } else {
                                      this.obtenerListaLotes(this.masterPlanId);
                                    }
                                  })
                                }
                              } else {
                                this.alertCtrl.create({
                                  message: "En este momento, el lote solicitado no está disponible para su venta.",
                                  buttons: ['Cerrar'],
                                }).then((response: any) => response.present())
                              }
                            }
                          }
                        });
                      }
                    } else {
                      if (loteActual.idRel_tipo_estatus != 3 && loteActual.idRel_tipo_estatus != 4 && loteActual.idRel_tipo_estatus != 5) {
                        lote.addEventListener('mouseover', (event) => {
                          const loteEnontrado = this.obtenerLote(loteUUID);

                          if ((loteEnontrado.idRel_tipo_estatus != 5 && loteEnontrado.idRel_tipo_estatus != 4) || this.authService.havePermission('Masterplan', 'Ver todo')) {
                            const lote = event.target as HTMLElement;
                            lote.style.cursor = "pointer";
                            lote.style.fill = "rgba(255, 255, 255, 0.5)";
                          }
                        });

                        lote.addEventListener('mouseout', (event) => {
                          const loteElement = event.target as HTMLElement;
                          loteElement.style.fill = this.obtenerEstadoLote(loteActual);
                        });


                        lote.addEventListener('click', async (event) => {
                          if (
                            this.mousePosition.positionX === (event as MouseEvent).screenX &&
                            this.mousePosition.positionY === (event as MouseEvent).screenY
                          ) {
                            this.obtenerEscalaYCoordenadas();
                            const lote = this.obtenerLote(loteUUID);
                            if (lote) {
                              if (lote.estatus_lote == 1 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                                if (lote.idRel_tipo_estatus != 5 && lote.idRel_tipo_estatus != 4 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                                  console.log("Mapa page", this.dentroModal);

                                  const modal = await this.modalCtrl.create({
                                    component: ModalVisualizarComponent,
                                    cssClass: 'modal-visualizar',
                                    componentProps: {
                                      data: { ...{ 'id_proyecto': this.proyectoId }, ...lote },
                                      dentroModal: this.dentroModal,
                                      interesadoDentroModal: this.data
                                    },
                                    backdropDismiss: false,
                                  });
                                  modal.present();
                                  modal.onDidDismiss().then((data: any) => {
                                    if (data.role === "seleccionado") {
                                      this.modalCtrl.dismiss(data.data, 'seleccionado');
                                    } else {
                                      this.obtenerListaLotes(this.masterPlanId);
                                    }
                                  })
                                }
                              } else {
                                this.alertCtrl.create({
                                  message: "En este momento, el lote solicitado no está disponible para su venta.",
                                  buttons: ['Cerrar'],
                                }).then((response: any) => response.present())
                              }
                            }
                          }
                        });
                      }
                    }
                  } else {
                    (lote as HTMLElement).style.fill = "rgb(227, 227, 227)"
                  }
                });
              }

              this.contenedorSVG.nativeElement.replaceChildren();
              this.contenedorSVG.nativeElement.appendChild(svgElement);

              const panZoomConfiguracion = {
                canvas: true,
                noBind: false,
                maxScale: 5,
                minScale: 0.5,
                handleStartEvent: (event: any) => { },
                cursor: 'grab',
                startScale: this.panzoomEscalaCoordenadas.escala,
                startX: this.panzoomEscalaCoordenadas.coordenadas.x,
                startY: this.panzoomEscalaCoordenadas.coordenadas.y,
              }

              this.panzoomControl = PanZoom(
                this.contenedorSVG.nativeElement.firstElementChild as SVGElement, panZoomConfiguracion);

              this.contenedorSVG.nativeElement.addEventListener(
                'pointermove',
                this.panzoomControl.handleMove
              );
              this.contenedorSVG.nativeElement.addEventListener(
                'pointerup', (event: any) => {
                  this.panzoomControl.handleUp
                  event.target.style.cursor = "grab";
                });
              this.contenedorSVG.nativeElement.firstElementChild!.addEventListener(
                'pointerdown', (event: any) => {
                  this.panzoomControl.handleDown(event);
                  event.target.style.cursor = "grabbing";
                }
              );
              this.contenedorSVG.nativeElement.addEventListener(
                'wheel',
                this.panzoomControl.zoomWithWheel
              );
            }
          });
        }
      }
    });
  }

  // ---------------------------------------------------------------

  proyectoSeleccionado(event: any) {
    this.proyectoId = event.detail.value;
    this.obtenerMasterPlans(this.proyectoId);
    this.obtenerFormasDePago(this.proyectoId);
  }

  masterPlanSeleccionado(event: any) {
    this.masterPlanId = event.detail.value;
    this.obtenerListaLotes(this.masterPlanId)
  }

  cargarMasterPlan(masterPlanId: string) {
    if (this.contenedorSVG) {
      this.generalServices.get(`masterplans/obtenersvg/${masterPlanId}`).subscribe((response) => {
        const masterPlanJSON: any = response;
        if (masterPlanJSON['svgString']) {
          const masterPlan = masterPlanJSON['svgString'];
          const domParser = new DOMParser();
          const svgElement = domParser.parseFromString(
            masterPlan,
            'image/svg+xml'
          ).documentElement;
          const lotes = svgElement.querySelectorAll('[lote-uuid]');
          if (lotes) {
            lotes.forEach((lote) => {
              const loteUUID = lote.attributes.getNamedItem('lote-uuid')!.value;
              const loteActual = this.obtenerLote(loteUUID);

              if (loteActual) {
                (lote as HTMLElement).style.fill = this.obtenerEstadoLote(loteActual);
                lote.addEventListener('mousedown', (event) => {
                  this.mousePosition.positionX = (event as MouseEvent).screenX;
                  this.mousePosition.positionY = (event as MouseEvent).screenY;
                });
                if (this.authService.havePermission('Masterplan', 'Ver todo')) {
                  if (loteActual.idRel_tipo_estatus != 3 && loteActual.idRel_tipo_estatus != 4) {
                    lote.addEventListener('mouseover', (event) => {
                      const loteEnontrado = this.obtenerLote(loteUUID);

                      if ((loteEnontrado.idRel_tipo_estatus != 5 && loteEnontrado.idRel_tipo_estatus != 4) || this.authService.havePermission('Masterplan', 'Ver todo')) {
                        const lote = event.target as HTMLElement;
                        lote.style.cursor = "pointer";
                        lote.style.fill = "rgba(255, 255, 255, 0.5)";
                      }
                    });

                    lote.addEventListener('mouseout', (event) => {
                      const loteElement = event.target as HTMLElement;
                      loteElement.style.fill = this.obtenerEstadoLote(loteActual);
                    });


                    lote.addEventListener('click', async (event) => {
                      if (
                        this.mousePosition.positionX === (event as MouseEvent).screenX &&
                        this.mousePosition.positionY === (event as MouseEvent).screenY
                      ) {
                        this.obtenerEscalaYCoordenadas();
                        const lote = this.obtenerLote(loteUUID);
                        if (lote) {
                          if (lote.estatus_lote == 1 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                            if (lote.idRel_tipo_estatus != 5 && lote.idRel_tipo_estatus != 4 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                              console.log("Mapa page", this.dentroModal);

                              const modal = await this.modalCtrl.create({
                                component: ModalVisualizarComponent,
                                cssClass: 'modal-visualizar',
                                componentProps: {
                                  data: { ...{ 'id_proyecto': this.proyectoId }, ...lote },
                                  dentroModal: this.dentroModal,
                                  interesadoDentroModal: this.data
                                },
                                backdropDismiss: false,
                              });
                              modal.present();
                              modal.onDidDismiss().then((data: any) => {
                                if (data.role === "seleccionado") {
                                  this.modalCtrl.dismiss(data.data, 'seleccionado');
                                } else {
                                  this.obtenerListaLotes(this.masterPlanId);
                                }
                              })
                            }
                          } else {
                            this.alertCtrl.create({
                              message: "En este momento, el lote solicitado no está disponible para su venta.",
                              buttons: ['Cerrar'],
                            }).then((response: any) => response.present())
                          }
                        }
                      }
                    });
                  }
                } else {
                  if (loteActual.idRel_tipo_estatus != 3 && loteActual.idRel_tipo_estatus != 4 && loteActual.idRel_tipo_estatus != 5) {
                    lote.addEventListener('mouseover', (event) => {
                      const loteEnontrado = this.obtenerLote(loteUUID);

                      if ((loteEnontrado.idRel_tipo_estatus != 5 && loteEnontrado.idRel_tipo_estatus != 4) || this.authService.havePermission('Masterplan', 'Ver todo')) {
                        const lote = event.target as HTMLElement;
                        lote.style.cursor = "pointer";
                        lote.style.fill = "rgba(255, 255, 255, 0.5)";
                      }
                    });

                    lote.addEventListener('mouseout', (event) => {
                      const loteElement = event.target as HTMLElement;
                      loteElement.style.fill = this.obtenerEstadoLote(loteActual);
                    });


                    lote.addEventListener('click', async (event) => {
                      if (
                        this.mousePosition.positionX === (event as MouseEvent).screenX &&
                        this.mousePosition.positionY === (event as MouseEvent).screenY
                      ) {
                        this.obtenerEscalaYCoordenadas();
                        const lote = this.obtenerLote(loteUUID);
                        if (lote) {
                          if (lote.estatus_lote == 1 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                            if (lote.idRel_tipo_estatus != 5 && lote.idRel_tipo_estatus != 4 || this.authService.havePermission('Masterplan', 'Ver todo')) {
                              console.log("Mapa page", this.dentroModal);

                              const modal = await this.modalCtrl.create({
                                component: ModalVisualizarComponent,
                                cssClass: 'modal-visualizar',
                                componentProps: {
                                  data: { ...{ 'id_proyecto': this.proyectoId }, ...lote },
                                  dentroModal: this.dentroModal,
                                  interesadoDentroModal: this.data
                                },
                                backdropDismiss: false,
                              });
                              modal.present();
                              modal.onDidDismiss().then((data: any) => {
                                if (data.role === "seleccionado") {
                                  this.modalCtrl.dismiss(data.data, 'seleccionado');
                                } else {
                                  this.obtenerListaLotes(this.masterPlanId);
                                }
                              })
                            }
                          } else {
                            this.alertCtrl.create({
                              message: "En este momento, el lote solicitado no está disponible para su venta.",
                              buttons: ['Cerrar'],
                            }).then((response: any) => response.present())
                          }
                        }
                      }
                    });
                  }
                }
              } else {
                (lote as HTMLElement).style.fill = "rgb(227, 227, 227)"
              }
            });
          }

          this.contenedorSVG.nativeElement.replaceChildren();
          this.contenedorSVG.nativeElement.appendChild(svgElement);

          const panZoomConfiguracion = {
            canvas: true,
            noBind: false,
            maxScale: 5,
            minScale: 0.5,
            handleStartEvent: (event: any) => { },
            cursor: 'grab',
            startScale: this.panzoomEscalaCoordenadas.escala,
            startX: this.panzoomEscalaCoordenadas.coordenadas.x,
            startY: this.panzoomEscalaCoordenadas.coordenadas.y,
          }

          this.panzoomControl = PanZoom(
            this.contenedorSVG.nativeElement.firstElementChild as SVGElement, panZoomConfiguracion);

          this.contenedorSVG.nativeElement.addEventListener(
            'pointermove',
            this.panzoomControl.handleMove
          );
          this.contenedorSVG.nativeElement.addEventListener(
            'pointerup', (event: any) => {
              this.panzoomControl.handleUp
              event.target.style.cursor = "grab";
            });
          this.contenedorSVG.nativeElement.firstElementChild!.addEventListener(
            'pointerdown', (event: any) => {
              this.panzoomControl.handleDown(event);
              event.target.style.cursor = "grabbing";
            }
          );
          this.contenedorSVG.nativeElement.addEventListener(
            'wheel',
            this.panzoomControl.zoomWithWheel
          );
        }
      });
    }
  }

  zoomIn() {
    this.panzoomControl.zoomIn();
  }

  zoomOut() {
    this.panzoomControl.zoomOut();
  }

  zoomWheel($event: WheelEvent) {
    this.panzoomControl.zoomWithWheel($event);
  }

  centrarMapa() {
    this.panzoomControl.reset();
  }

  obtenerEscalaYCoordenadas() {
    this.panzoomEscalaCoordenadas.escala = this.panzoomControl.getScale();
    this.panzoomEscalaCoordenadas.coordenadas = this.panzoomControl.getPan();
  }


  obtenerLote(lote_uuid: string) {
    const loteIndex = this.listaLotes.data.findIndex((lote: any) => lote.uuid_lote == lote_uuid);
    return this.listaLotes.data[loteIndex]
  }

  obtenerEstadoLote(lote: any): string {
    const tipoLote = this.listaIndicadores.find((indicador: any) => indicador.id_tipo_estatus == lote.idRel_tipo_estatus);
    if (tipoLote['id_tipo_estatus'] != '1') {
      return tipoLote['color_tipo_estatus'];
    }
    return 'rgba(255, 255, 255, 0)';
  }
}
