"""Ses Gürültü Temizleyici — sade profesyonel Gradio arayüzü."""

from __future__ import annotations

from pathlib import Path

import gradio as gr

from cleaner import SUPPORTED_EXTENSIONS, clean_audio

ROOT = Path(__file__).resolve().parent
CSS_PATH = ROOT / "static" / "app.css"

METHOD_LABELS = {
    "Yapay zeka": "denoiser",
    "Klasik": "noisereduce",
    "Güçlü": "combo",
}

HERO_HTML = """
<header class="st-top">
  <div class="st-brand">
    <div class="st-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M4 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>
      </svg>
    </div>
    <div class="st-brand-copy">
      <p class="st-eyebrow">Yerel ses aracı</p>
      <h1 class="st-title">Ses Temizleyici</h1>
      <p class="st-sub">Gürültüyü azaltır, konuşmayı netleştirir</p>
    </div>
  </div>
</header>
"""

FOOTER_HTML = """
<p class="st-note">Yapay zeka yöntemi çoğu kayıt için yeterlidir · İlk çalıştırmada model indirilir · Dosyalarınız yerelde kalır</p>
"""


def process(
    file_obj,
    method_label: str,
    strength: float,
    output_format: str,
    progress=gr.Progress(track_tqdm=False),
):
    if file_obj is None:
        raise gr.Error("Lütfen bir ses veya video dosyası yükleyin.")

    path = Path(file_obj if isinstance(file_obj, str) else file_obj.name)
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise gr.Error(
            f"Desteklenmeyen format: {path.suffix}\n"
            f"Desteklenen: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    method = METHOD_LABELS.get(method_label, "denoiser")
    fmt = "mp3" if str(output_format).lower().startswith("mp3") else "wav"

    progress(0.1, desc="Ses çıkarılıyor…")
    try:
        progress(0.35, desc="Gürültü temizleniyor…")
        out_path = clean_audio(
            path,
            method=method,
            strength=strength / 100.0,
            output_format=fmt,
        )
        progress(1.0, desc="Tamamlandı")
        return str(out_path), str(out_path)
    except Exception as exc:
        raise gr.Error(f"İşlem başarısız: {exc}") from exc


def build_theme() -> gr.themes.Base:
    return gr.themes.Base(
        primary_hue="teal",
        secondary_hue="slate",
        neutral_hue="slate",
        font=gr.themes.GoogleFont("Plus Jakarta Sans"),
        font_mono=gr.themes.GoogleFont("IBM Plex Mono"),
        radius_size=gr.themes.sizes.radius_md,
        spacing_size=gr.themes.sizes.spacing_md,
        text_size=gr.themes.sizes.text_md,
    ).set(
        body_background_fill="#eef5f4",
        body_text_color="#12302c",
        block_background_fill="transparent",
        block_border_width="0px",
        block_label_background_fill="transparent",
        block_label_border_width="0px",
        block_label_text_color="#5d7571",
        block_label_text_weight="600",
        block_label_padding="0",
        block_padding="0",
        block_radius="0",
        block_shadow="none",
        block_title_text_weight="700",
        button_primary_background_fill="#0f766e",
        button_primary_background_fill_hover="#0d9488",
        button_primary_text_color="#ffffff",
        button_primary_shadow="none",
        button_large_padding="12px 20px",
        input_background_fill="#ffffff",
        input_border_color="#d5e3df",
        input_border_width="1px",
        input_radius="10px",
        checkbox_background_color="#ffffff",
        checkbox_border_color="#b9cdc8",
        checkbox_label_background_fill="transparent",
        checkbox_label_background_fill_selected="transparent",
        checkbox_label_border_color="transparent",
        checkbox_label_border_width="0px",
        shadow_drop="none",
        shadow_drop_lg="none",
    )


def load_css() -> str:
    if CSS_PATH.exists():
        return CSS_PATH.read_text(encoding="utf-8")
    return ""


with gr.Blocks(title="Ses Temizleyici", fill_height=False) as demo:
    gr.HTML(HERO_HTML)

    with gr.Row(elem_id="workbench"):
        with gr.Column(scale=5, elem_classes=["st-card"]):
            gr.HTML('<h2 class="st-card-title">Girdi</h2>')
            infile = gr.File(
                label="Dosya yükle",
                file_types=list(SUPPORTED_EXTENSIONS),
                type="filepath",
                height=120,
            )
            method = gr.Radio(
                choices=list(METHOD_LABELS.keys()),
                value="Yapay zeka",
                label="Temizleme yöntemi",
                elem_classes=["st-seg"],
            )
            strength = gr.Slider(
                minimum=30,
                maximum=100,
                value=90,
                step=5,
                label="Temizlik gücü",
            )
            out_fmt = gr.Radio(
                choices=["WAV", "MP3"],
                value="WAV",
                label="Çıktı formatı",
                elem_classes=["st-seg"],
            )
            btn = gr.Button(
                "Gürültüyü temizle",
                variant="primary",
                size="lg",
                elem_id="clean-btn",
            )

        with gr.Column(scale=5, elem_classes=["st-card", "st-card-out"]):
            gr.HTML('<h2 class="st-card-title">Sonuç</h2>')
            preview = gr.Audio(
                label="Ses önizleme",
                type="filepath",
                interactive=False,
            )
            download = gr.File(label="Dosyayı indir", height=90)

    gr.HTML(FOOTER_HTML)

    btn.click(
        fn=process,
        inputs=[infile, method, strength, out_fmt],
        outputs=[preview, download],
    )


if __name__ == "__main__":
    print("Uygulama baslatiliyor -> http://127.0.0.1:7861")
    demo.queue(max_size=4).launch(
        server_name="127.0.0.1",
        server_port=7861,
        inbrowser=True,
        theme=build_theme(),
        css=load_css(),
        head='<meta name="viewport" content="width=device-width, initial-scale=1">',
    )
