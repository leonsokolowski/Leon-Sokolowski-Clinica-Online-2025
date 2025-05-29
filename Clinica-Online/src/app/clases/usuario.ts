export abstract class Usuario {
  id?: number;
  nombre: string = '';
  apellido: string = '';
  edad: number = 0;
  dni: string = '';
  email: string = '';
  perfil: string = ''; // Tipo de usuario: 'paciente', 'especialista', 'admin'
  created_at?: string;
  habilitado: boolean = false;
  imagen_perfil_1?: string = ''; // Primera imagen (todos pueden tenerla)

  constructor(
    nombre: string = '',
    apellido: string = '',
    edad: number = 0,
    dni: string = '',
    email: string = '',
    perfil: string = ''
  ) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.edad = edad;
    this.dni = dni;
    this.email = email;
    this.perfil = perfil;
  }

  // Método para obtener nombre completo
  get nombreCompleto(): string {
    return `${this.nombre} ${this.apellido}`;
  }

  // Método para validar datos básicos
  abstract validar(): boolean;
}

export class Paciente extends Usuario {
  obra_social: string = '';
  imagen_perfil_2: string = ''; // Segunda imagen (solo pacientes)

  constructor(
    nombre: string = '',
    apellido: string = '',
    edad: number = 0,
    dni: string = '',
    email: string = '',
    obra_social: string = '',
    imagen_perfil_1: string = '',
    imagen_perfil_2: string = ''
  ) {
    super(nombre, apellido, edad, dni, email, 'paciente');
    this.obra_social = obra_social;
    this.imagen_perfil_1 = imagen_perfil_1;
    this.imagen_perfil_2 = imagen_perfil_2;
    this.habilitado = true; // Los pacientes se habilitan automáticamente
  }

  validar(): boolean {
    return !!(
      this.nombre.trim() &&
      this.apellido.trim() &&
      this.edad >= 18 &&
      this.dni.trim() &&
      this.email.trim() &&
      this.obra_social.trim() &&
      this.imagen_perfil_1?.trim() &&
      this.imagen_perfil_2?.trim()
    );
  }
}

export class Especialista extends Usuario {
  especialidades: string[] = []; // Array de especialidades
  // imagen_perfil_1 se hereda de Usuario

  constructor(
    nombre: string = '',
    apellido: string = '',
    edad: number = 0,
    dni: string = '',
    email: string = '',
    especialidades: string[] = [],
    imagen_perfil_1: string = ''
  ) {
    super(nombre, apellido, edad, dni, email, 'especialista');
    this.especialidades = especialidades;
    this.imagen_perfil_1 = imagen_perfil_1;
    this.habilitado = false; // Los especialistas requieren aprobación
  }

  validar(): boolean {
    return !!(
      this.nombre.trim() &&
      this.apellido.trim() &&
      this.edad >= 18 &&
      this.dni.trim() &&
      this.email.trim() &&
      this.especialidades.length > 0 &&
      this.imagen_perfil_1?.trim()
    );
  }
}

export class Admin extends Usuario {
  constructor(
    nombre: string = '',
    apellido: string = '',
    edad: number = 0,
    dni: string = '',
    email: string = '',
    imagen_perfil_1: string = ''
  ) {
    super(nombre, apellido, edad, dni, email, 'admin');
    this.imagen_perfil_1 = imagen_perfil_1;
    this.habilitado = true;
  }

  validar(): boolean {
    return !!(
      this.nombre.trim() &&
      this.apellido.trim() &&
      this.edad >= 18 &&
      this.dni.trim() &&
      this.email.trim()
    );
  }
}