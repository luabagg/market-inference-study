/**
 * Seu motor de amostragem.
 *
 * Preencha cada função seguindo a apostila indicada. Para usar este motor:
 *   - nos testes:  MOTOR=aluno pnpm test
 *   - no app:      NEXT_PUBLIC_MOTOR=aluno pnpm dev
 *
 * Os testes em `motor.test.ts` usam os exemplos resolvidos das apostilas, então
 * você sabe que acertou quando eles passam. `referencia.ts` tem uma versão pronta
 * caso queira comparar depois.
 */
import type { MotorAmostragem } from "./tipos";

const pendente = (onde: string) => (): never => {
  throw new Error(`Ainda não implementado: ${onde}`);
};

export const motorAluno: MotorAmostragem = {
  z: pendente("Parte II, §6 (quantis z)"),
  aas: {
    sortear: pendente("Parte I, §4 (AAS sem reposição)"),
    probInclusao: pendente("Parte I, §4.2 (πi = n/N)"),
    estimarMedia: pendente("Parte II, §4.1 (média sob AAS)"),
    estimarTotal: pendente("Parte II, §4.1 (total sob AAS)"),
    estimarProporcao: pendente("Parte II, §9.2 (proporção sob AAS)"),
    tamanhoParaMedia: pendente("Parte II, §7.2 (tamanho para média)"),
    tamanhoParaProporcao: pendente("Parte II, §10.2 (tamanho para proporção)"),
  },
  aes: {
    alocar: pendente("Parte III, §5–6 (alocação)"),
    sortear: pendente("Parte III, §2 (seleção por estrato)"),
    estimarMedia: pendente("Parte III, §3.2 e §4.2 (média sob AES)"),
    estimarTotal: pendente("Parte III, §3.1 e §4.1 (total sob AES)"),
    tamanhoParaMedia: pendente("Parte III, §7 (tamanho total)"),
  },
  as: {
    sortear: pendente("Parte IV, §1.1 (seleção sistemática)"),
    estimarMedia: pendente("Parte IV, §5 (estimadores de variância)"),
  },
  ht: {
    pesos: pendente("Parte I, §10 (wi = 1/πi)"),
    total: pendente("Parte I, §10 (Ŷ_HT)"),
  },
};
