function obtenerDiaDeLaSemana(fecha) {
  const fechaObj = new Date(fecha);
  const diaSemanaNumero = fechaObj.getDay();
  if (diaSemanaNumero == 0) {
    return "Domingo";
  } else {
    if (diaSemanaNumero == 1) {
      return "Lunes";
    } else {
      if (diaSemanaNumero == 2) {
        return "Martes";
      } else {
        if (diaSemanaNumero == 3) {
          return "Miércoles";
        } else {
          if (diaSemanaNumero == 4) {
            return "Jueves";
          } else {
            if (diaSemanaNumero == 5) {
              return "Viernes";
            } else {
              if (diaSemanaNumero == 6) {
                return "Sábado";
              } 
            }
          }
        }
      }
    }
  }
}
