async function cargarMasterPlan(masterPlanId) {
    if (this.contenedorSVG) {
        const response = await fetch(`masterplans/obtenersvg/${masterPlanId}`);
        const masterPlanJSON = await response.json();
        if (masterPlanJSON['svgString']) {
            const masterPlan = masterPlanJSON['svgString'];
            const domParser = new DOMParser();
            const svgElement = domParser.parseFromString(masterPlan, 'image/svg+xml').documentElement;
            const lotes = svgElement.querySelectorAll('[lote-uuid]');
            if (lotes) {
                lotes.forEach((lote) => {
                    const loteUUID = lote.attributes.getNamedItem('lote-uuid').value;
                    const loteActual = this.obtenerLote(loteUUID);
                    if (loteActual) {
                        (lote).style.fill = this.obtenerEstadoLote(loteActual);
                        if (this.authService.havePermission('Masterplan', 'Ver todo')) {
                            if (loteActual.idRel_tipo_estatus != 3 && loteActual.idRel_tipo_estatus != 4) {
                                this.funcionalidadLote(lote, loteUUID, loteActual);
                            }
                        } else {
                            if (loteActual.idRel_tipo_estatus != 3 && loteActual.idRel_tipo_estatus != 4 && loteActual.idRel_tipo_estatus != 5) {
                                this.funcionalidadLote(lote, loteUUID, loteActual);
                            }
                        }
                        lote.addEventListener('mousedown', function (event) {
                            this.mousePosition.positionX = (event).screenX;
                            this.mousePosition.positionY = (event).screenY;
                        });
                    } else {
                        (lote).style.fill = "rgb(227, 227, 227)"
                    }
                });
            }
        }
    }
}
