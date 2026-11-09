/**
 * Plain-language description of each sampling method, for the client-facing
 * pages. Numbers that depend on the study (strata, step k) come in as params.
 */
import type { Design } from "@/sampling/simulation";

export type MethodCopy = {
  name: string;
  /** Course name and acronym, for the presentation page. */
  technical: string;
  idea: string;
  pros: string[];
  cons: string[];
};

export const methodCopy = (design: Design, ctx: { strata: number; n: number; step: number }): MethodCopy => {
  const perStratum = Math.round(ctx.n / ctx.strata);
  const copy: Record<Design, MethodCopy> = {
    aas: {
      name: "Sorteio simples",
      technical: "Amostragem aleatória simples (AAS)",
      idea: "Todo usuário tem a mesma chance de entrar, como tirar nomes de uma urna.",
      pros: [
        "É o mais fácil de explicar e de auditar.",
        "Não precisa saber nada sobre os usuários antes do sorteio.",
        "A margem de erro sai da fórmula mais simples do curso.",
      ],
      cons: [
        "Por azar, uma região ou faixa de renda pode ficar com pouca gente.",
        "Ignora o que já sabemos sobre os usuários, como região e renda.",
      ],
    },
    "aes-proporcional": {
      name: "Sorteio por grupos, proporcional",
      technical: "Amostragem estratificada com alocação proporcional (AES)",
      idea: `Separa os usuários em ${ctx.strata} grupos (região × faixa de renda) e sorteia dentro de cada um, na proporção do tamanho do grupo.`,
      pros: [
        "Cada região e faixa de renda entra na amostra com o tamanho que tem na base.",
        "Teve margem menor que o sorteio simples em todas as perguntas testadas.",
        "Todo sorteado vale o mesmo número de usuários, então o resultado é fácil de conferir.",
      ],
      cons: [
        "Precisa da região e da renda de todos os usuários antes de sortear.",
        "Quando os grupos têm pouca relação com a pergunta, o ganho é pequeno.",
      ],
    },
    "aes-neyman": {
      name: "Sorteio por grupos, ajustado a uma pergunta",
      technical: "Amostragem estratificada com alocação de Neyman",
      idea: "Sorteia mais gente nos grupos em que a resposta varia mais. O ajuste aqui usa a pergunta do Café Reserva.",
      pros: ["Tem a menor margem na pergunta usada no ajuste.", "Funciona bem quando o estudo tem uma pergunta principal."],
      cons: [
        "Precisa de uma pesquisa anterior para saber quanto a resposta varia em cada grupo.",
        "Nas outras perguntas pode perder até para o proporcional.",
        "Cada grupo tem um peso diferente, o que deixa a conta menos transparente.",
      ],
    },
    "aes-igual": {
      name: "Mesmo número por grupo",
      technical: "Amostragem estratificada com alocação igual",
      idea: `Sorteia cerca de ${perStratum} pessoas em cada um dos ${ctx.strata} grupos, seja ele grande ou pequeno.`,
      pros: [
        "Permite comparar grupos pequenos com a mesma precisão dos grandes.",
        "Serve para relatórios por região ou faixa de renda.",
      ],
      cons: [
        "A margem do total fica muito maior que nos outros métodos.",
        "Sorteados de grupos grandes valem por muitos usuários, e os de grupos pequenos por poucos.",
      ],
    },
    as: {
      name: "Sorteio sistemático",
      technical: "Amostragem sistemática (AS)",
      idea: `Ordena os usuários de norte a sul e pega um a cada ${ctx.step}, a partir de um ponto de partida sorteado.`,
      pros: ["É simples de executar numa lista.", "Espalha a amostra pelo mapa sem precisar montar grupos."],
      cons: [
        `Só existem ${ctx.step} amostras possíveis, uma para cada ponto de partida.`,
        "A fórmula da margem supõe que a lista está em ordem aleatória, então o intervalo pode errar para mais ou para menos.",
        `Se a lista tiver um padrão que se repete a cada ${ctx.step} pessoas, o resultado sai distorcido.`,
      ],
    },
  };
  return copy[design];
};
