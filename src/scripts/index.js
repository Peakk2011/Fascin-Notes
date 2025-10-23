window.electronAPI.onInitOS((os) => {
    document.body.classList.add(os);
    console.log('Index OS:', os);
});