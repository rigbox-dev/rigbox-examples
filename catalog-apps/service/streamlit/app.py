import streamlit as st

st.set_page_config(page_title="Streamlit on Rigbox", page_icon=":rocket:")
st.title("Streamlit on Rigbox")
st.write("Edit `app.py` next to `rig.yaml`, then `rig deploy` to ship.")

name = st.text_input("Your name", "Developer")
st.write(f"Welcome, **{name}**!")
