/**
 * Ponto único de troca do motor. O app inteiro recebe `motor` daqui e o repassa
 * como argumento para as funções que montam simulações e estudos.
 */
import { motorAluno } from "./aluno";
import { motorReferencia } from "./referencia";
import type { MotorAmostragem } from "./tipos";

export const motor: MotorAmostragem =
  process.env.NEXT_PUBLIC_MOTOR === "aluno" || process.env.MOTOR === "aluno" ? motorAluno : motorReferencia;

export type * from "./tipos";
