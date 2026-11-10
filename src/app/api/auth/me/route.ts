
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ehAdministrador, obterUsuarioSessao } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CABECALHOS_SEGUROS = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_session")?.value;

    if (!token) {
      return NextResponse.json(
        { erro: "Não autenticado." },
        { status: 401, headers: CABECALHOS_SEGUROS },
      );
    }

    const usuario = await obterUsuarioSessao(token);

    if (!usuario) {
      const resposta = NextResponse.json(
        { erro: "Sessão inválida ou expirada." },
        { status: 401, headers: CABECALHOS_SEGUROS },
      );

      resposta.cookies.set("cm_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });

      return resposta;
    }

    return NextResponse.json(
      {
        autenticado: true,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          usuario: usuario.usuario,
          perfil: usuario.perfil,
          unidade_id: usuario.unidade_id,
          administradorGeral: ehAdministrador(usuario),
        },
      },
      { headers: CABECALHOS_SEGUROS },
    );
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);

    return NextResponse.json(
      { erro: "Não foi possível verificar a sessão." },
      { status: 500, headers: CABECALHOS_SEGUROS },
    );
  }
}
