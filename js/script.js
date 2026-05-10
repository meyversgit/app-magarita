function showSection(sectionId){

    const title = document.getElementById('sectionTitle');

    if(sectionId === 'inicio'){
        title.innerText = 'Bienvenido, Maria';
    }else if(sectionId === 'pagos'){
        title.innerText = 'Pagos';
    }else if(sectionId === 'reservas'){
        title.innerText = 'Reservas';
    }else if(sectionId === 'incidencias'){
        title.innerText = 'Incidencias';
    }else if(sectionId === 'reportar'){
        title.innerText = 'Reportar incidencia';
    }else if(sectionId === 'notificaciones'){
        title.innerText = 'Notificaciones';
    }else if(sectionId === 'perfil'){
        title.innerText = 'Mi perfil';
    }

    const sections = document.querySelectorAll('.section');

    sections.forEach(section => {
        section.classList.remove('active-section');
    });

    document.getElementById(sectionId).classList.add('active-section');

    const buttons = document.querySelectorAll('.menu-btn');

    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
}


function openModal(id){
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id){
    document.getElementById(id).style.display = 'none';
}


function nextReservation(){
    closeModal('reserveModal');
    openModal('summaryModal');
}


function confirmReservation(){
    closeModal('summaryModal');
    openModal('successModal');
}


function finishReservation(){
    closeModal('successModal');
}


function reserveFromDetails(){
    closeModal('detailModal');
    openModal('reserveModal');
}


function sendIncident(event){
    event.preventDefault();

    alert('La incidencia fue enviada correctamente');

    showSection('incidencias');
}


window.onclick = function(event){

    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        if(event.target === modal){
            modal.style.display = 'none';
        }
    });
}