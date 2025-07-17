// src/pages/ContactPage.tsx
import React, { useState } from "react";
import styles from "./ContactPage.module.css";

export default function ContactPage() {
  // Estados para cada campo del formulario
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); // Evita que la página se recargue

    const numeroWhatsApp = "+59168503758";

    // Construimos el mensaje con los datos del formulario
    const mensajeFinal = `*Nuevo Mensaje de Contacto* 📬\n\n*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Correo:* ${email}\n\n*Mensaje:*\n${message}`;

    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensajeFinal)}`;

    window.open(url, "_blank"); // Abre WhatsApp en una nueva pestaña
  };

  return (
    <main className={styles.pageContainer}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Contáctanos</h1>
        <p className={styles.subtitle}>Estamos aquí para ayudarte. Envíanos tu consulta y te responderemos a la brevedad.</p>
      </div>

      <div className={styles.contactWrapper}>
        {/* Columna de Información */}
        <div className={styles.infoContainer}>
          <h2>Información de Contacto</h2>
          <p>Si prefieres, puedes contactarnos directamente a través de los siguientes medios.</p>
          <ul className={styles.infoList}>
            <li>📞 <strong>Teléfono:</strong> +591 68503758</li>
            <li>📧 <strong>Correo:</strong> informacion@bomberosatoq.org</li>
            <li>📍 <strong>Ubicación:</strong> Cochabamba, Bolivia</li>
          </ul>
        </div>

        {/* Columna del Formulario */}
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input type="text" id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              <label htmlFor="name">Nombre Completo</label>
            </div>
            <div className={styles.inputGroup}>
              <input type="tel" id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              <label htmlFor="phone">Teléfono</label>
            </div>
            <div className={styles.inputGroup}>
              <input type="email" id="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <label htmlFor="email">Correo Electrónico</label>
            </div>
            <div className={styles.inputGroup}>
              <textarea id="message" rows={5} required value={message} onChange={(e) => setMessage(e.target.value)}></textarea>
              <label htmlFor="message">Tu Mensaje</label>
            </div>
            <button type="submit" className={styles.submitButton}>
              Enviar Mensaje por WhatsApp
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}