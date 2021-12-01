// db33rgb.js

var serialport = require('serialport');
var portName = 'COM3';  // check your COM port!!
var port    =   process.env.PORT || 3000;  // port for DB

var io = require('socket.io').listen(port);

// MongoDB
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/iot33imu", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log("mongo db connection OK.");
});
// Schema
var iotSchema = new Schema({
    date : String,
    accel_x : String,
    accel_y : String,
    accel_z : String,
    gyro_x : String,
    gyro_y : String,
    gyro_z : String,
    mag_x : String,
    mag_y : String,
    mag_z : String
});
// Display data on console in the case of saving data.
iotSchema.methods.info = function () {
    var iotInfo = this.date
    ? "Current date: " + this.date +", accX: " + this.accel_x
    + ", accY : " + this.accel_y + ", accZ: " + this.accel_z + ", gyrX: " + this.gyro_x  
    + ", gyrY: " + this.gyro_y + ", gyrZ: " + this.gyro_z + ", magX: " + this.mag_x + ", magY: " + this.mag_y + ", magZ: " + this.mag_z
    : "I don't have a date"
    console.log("iotInfo: " + iotInfo);
}


const Readline = require("@serialport/parser-readline");

// serial port object
var sp = new serialport(portName, {
  baudRate: 9600, // 9600  38400
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: false,
  parser: new Readline("\r\n"),
  //   parser: serialport.parsers.readline("\r\n"), // new serialport.parsers.Readline
});

// set parser
const parser = sp.pipe(new Readline({ delimiter: "\r\n" }));

// Open the port 
// sp.on("open", () => {
//     console.log("serial port open");
//   });

var readData = '';  // this stores the buffer
var acX = '';
var acY = '';
var acZ = '';
var gyX = '';
var gyY = '';
var gyZ = '';
var maX = '';
var maY = '';
var maZ = '';

var mdata =[]; // this array stores date and data from multiple sensors
var firstcommaidx = 0;
var secondcommaidx = 0;
var thirdcommaidx = 0;
var fourthcommaidx = 0;
var fifthcommaidx = 0;
var sixthcommaidx = 0;
var seventhcommaidx = 0;
var eighthcommaidx = 0;
var ninethcommaidx = 0;

var Sensor = mongoose.model("Sensor", iotSchema);  // sensor data model

// process data using parser
parser.on('data', (data) => { // call back when data is received
    readData = data.toString(); // append data to buffer
    firstcommaidx = readData.indexOf(','); 
    secondcommaidx = readData.indexOf(',',firstcommaidx+1);
    thirdcommaidx = readData.indexOf(',',secondcommaidx+1);
    fourthcommaidx = readData.indexOf(',',thirdcommaidx+1);
    fifthcommaidx = readData.indexOf(',',fourthcommaidx+1);
    sixthcommaidx = readData.indexOf(',',fifthcommaidx+1);
    seventhcommaidx = readData.indexOf(',',sixthcommaidx+1);
    eighthcommaidx = readData.indexOf(',',seventhcommaidx+1);
    ninethcommaidx = readData.indexOf(',',eighthcommaidx+1);

    // parsing data into signals
    if (readData.lastIndexOf(',') > firstcommaidx && firstcommaidx > 0) {
        acX = readData.substring(firstcommaidx + 1, secondcommaidx);
        acY = readData.substring(secondcommaidx + 1, thirdcommaidx);
        acZ = readData.substring(thirdcommaidx + 1, fourthcommaidx);
        gyX = readData.substring(fourthcommaidx + 1, fifthcommaidx);
        gyY = readData.substring(fifthcommaidx + 1, sixthcommaidx);
        gyZ = readData.substring(sixthcommaidx + 1, seventhcommaidx);
        maX = readData.substring(seventhcommaidx + 1, eighthcommaidx);
        maY = readData.substring(eighthcommaidx + 1, ninethcommaidx);
        maZ = readData.substring(readData.lastIndexOf(',')+1);
        readData = '';
        
        dStr = getDateString();
        mdata[0]=dStr;    // Date
        mdata[1]=acX;    // temperature data
        mdata[2]=acY;    // humidity data
        mdata[3]=acZ;     //  luminosity data
        mdata[4]=gyX;    // pressure data
        mdata[5]=gyY;       // r_ratio
        mdata[6]=gyZ;       // g_ratio
        mdata[7]=maX;       // b_ratio
        mdata[8]=maY;
        mdata[9]=maZ;        //console.log(mdata);
        var iotData = new Sensor({date:dStr, accel_x:acX, accel_y:acY, accel_z:acZ, gyro_x:gyX, 
            gyro_y:gyY, gyro_z:gyZ, mag_x:maX, mag_y:maY, mag_z:maZ});
        // save iot data to MongoDB
        iotData.save(function(err,data) {
            if(err) return handleEvent(err);
            data.info();  // Display the information of iot data  on console.
        })
        io.sockets.emit('message', mdata);  // send data to all clients 
    } else {  // error 
        console.log(readData);
    }
});


io.sockets.on('connection', function (socket) {
    // If socket.io receives message from the client browser then 
    // this call back will be executed.
    socket.on('message', function (msg) {
        console.log(msg);
    });
    // If a web browser disconnects from Socket.IO then this callback is called.
    socket.on('disconnect', function () {
        console.log('disconnected');
    });
});

// helper function to get a nicely formatted date string
function getDateString() {
    var time = new Date().getTime();
    // 32400000 is (GMT+9 Korea, GimHae)
    // for your timezone just multiply +/-GMT by 3600000
    var datestr = new Date(time +32400000).
    toISOString().replace(/T/, ' ').replace(/Z/, '');
    return datestr;
}