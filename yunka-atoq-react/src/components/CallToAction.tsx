// src/components/CallToAction.tsx
import React, { useState } from 'react';
import './CallToAction.css';

function CallToAction() {
  // 1. Estados para controlar el modal y los campos del formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // 2. Función para abrir el modal
  const handleOpenModal = () => setIsModalOpen(true);

  // 3. Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Opcional: Reinicia los campos del formulario al cerrar
    setName('');
    setPhone('');
    setEmail('');
    setMessage('');
  };

  // 4. Lógica de envío a WhatsApp (copiada y adaptada del formulario de contacto)
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const numeroWhatsApp = "+59168503758";
    const mensajeFinal = `*Solicitud de Voluntariado* 🤝\n\n*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Correo:* ${email}\n\n*Mensaje:*\n${message}`;
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensajeFinal)}`;
    window.open(url, "_blank");

    handleCloseModal(); // Cierra el modal después de enviar
  };

  return (
    <section className="cta-section">
      <div className="cta-content">
        <h2>¿Listo para unirte a nuestro equipo de voluntarios?</h2>
        <p>Juntos podemos hacer la diferencia. ¡Contáctanos para más información!</p>
        {/* 5. Añadimos un onClick para abrir el modal */}
        <button className="cta-button" onClick={handleOpenModal}>¡Quiero Unirme!</button>
      </div>

      {/* 6. Renderizado condicional del modal */}
      {isModalOpen && (
        <div className="modalBackdrop" onClick={handleCloseModal}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <button className="closeButton" onClick={handleCloseModal}>&times;</button>
            <h2>Formulario de Pre-Registro de Voluntario</h2>
            <form onSubmit={handleSubmit}>
              <div className="inputGroup">
                <input type="text" id="modal-name" required value={name} onChange={(e) => setName(e.target.value)} />
                <label htmlFor="modal-name">Nombre Completo</label>
              </div>
              <div className="inputGroup">
                <input type="tel" id="modal-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                <label htmlFor="modal-phone">Teléfono</label>
              </div>
              <div className="inputGroup">
                <input type="email" id="modal-email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <label htmlFor="modal-email">Correo Electrónico</label>
              </div>
              <div className="inputGroup">
                <textarea id="modal-message" rows={4} required value={message} onChange={(e) => setMessage(e.target.value)}></textarea>
                <label htmlFor="modal-message">¿Por qué te gustaría unirte?</label>
              </div>
              <button type="submit" className="modalSubmitButton">
                Enviar Solicitud
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default CallToAction;