// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', function(e){
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if(!target) return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

// Contact form submission to backend
const form = document.getElementById('contactForm');
form && form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Sending...';
  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    message: document.getElementById('message').value.trim()
  };
  try{
    const res = await fetch('/api/contact', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(res.ok){
      alert('Message sent — check your email (backend recipient).');
      form.reset();
    } else {
      const txt = await res.text();
      alert('Failed to send message: '+txt);
    }
  }catch(err){
    alert('Error: could not reach server. Make sure backend is running.');
  }finally{
    btn.disabled = false; btn.textContent = 'Send Message';
  }
});
