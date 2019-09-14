from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello World! 555 88 77 '

if __name__ == '__main__':
    app.run()
