const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mysql = require("mysql");
const {
    engine
} = require("express/lib/application");
const app = express();
const session = require("express-session");
const {
    redirect,
    location
} = require("express/lib/response");
const flash = require('connect-flash')

let register = ""
let date = new Date();

let YYYY = date.getFullYear();
let MM = date.getMonth() + 1;
let DD = date.getDate();
let currentDate = YYYY + "-" + MM + "-" + DD;

let hh = date.getHours();
let mm = date.getMinutes();
let ss = date.getSeconds();
let currentTime = hh + ":" + mm + ":" + ss;

let currentDt = currentDate + " " + currentTime;

// Datbase Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "appartmentDB"
});

db.connect((err) => {
    if (err) throw err;
    console.log("Appartment Database is running...");
});

// Session
app.use(session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

const isAuth = (req, res, next) => {
    if (req.session.isAuth) next();
    else {
        res.redirect("/");
    }
}

const superAdmin = (req, res, next) => {
    if (req.session.administrator) next();
    else {
        res.redirect("/");
    }
}
// Ejs engine
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

app.get("/createdb", (req, res) => {
    let sql = "CREATE TABLE visited_by(C_ID int(11),FNO VARCHAR(10),PRIMARY KEY(C_ID,FNO),FOREIGN KEY(C_ID) REFERENCES customer(C_ID) ON DELETE CASCADE,FOREIGN KEY(FNO) REFERENCES flat(FNO) ON DELETE CASCADE)";
    db.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send("table created")
    })
});

// Routes

// HOME
app.get("/", (req, res) => {
    console.log(req.body);
    res.render("index", {
        message: req.flash('message'),
        logged: req.flash('logged'),
        visMsg: req.flash('visMsg')
    });
});

// FLAT
app.get("/flat", (req, res) => {
    let sql1 = "SELECT * FROM flat";
    let query = db.query(sql1, (err, results) => {
        if (err) throw err;
        console.log(results);
        res.render("flatDetails", {
            flatResults: results,
            enqSubmit: req.flash('enqSubmit'),
            empty: req.flash('empty')
        });
    });
});

app.post("/flat", (req, res) => {
    const name = req.body.name;
    const phone = req.body.phone;
    let post = {
        CNAME: name,
        CPHONE: Number(phone)
    }
    console.log(post);
    let sql =`INSERT INTO customer (CNAME,CPHONE) VALUES ("${name}",${phone})`
    let query = db.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        if (name.length == 0 && phone.length == 0) {
            req.flash('empty', 'Please enter your name and phone no.')
            res.redirect("/flat");


        } else {
            req.flash('enqSubmit', "Submitted succesfully");
            res.redirect("/flat");
        }

    })
});

// LOG IN and OUT
app.post("/login", (req, res) => {
    const adminId = req.body.adminId;
    const password = req.body.password;

    let sql = "SELECT * FROM admin WHERE ADMIN_ID=? AND password=?"
    db.query(sql, [adminId, password], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.isAuth = true;
            if (results[0].POSITION == "Administrator") {
                req.session.administrator = true;
                res.redirect("/admin")
            } else {
                console.log(results);
                res.redirect("/admin/resident")
            }

        } else {
            console.log(results);
            req.flash('message', 'Wrong Username or Password !!!')
            res.redirect("/")
        }
    })
});

app.get("/logout", (req, res) => {
    req.session.isAuth = false;
    req.session.superAdmin = false;
    res.redirect("/")
});

// ADMIN
app.get("/admin", isAuth, superAdmin, (req, res) => {
    register = "Register"
    let sql = "SELECT * FROM admin";
    db.query(sql, (err, results) => {
        if (err) throw err;
        console.log(results);
        res.render("admin", {
            success: req.flash('success'),
            error: req.flash('error'),
            result: results
        })
    })
});


app.post("/admin", (req, res) => {
    console.log(req.body);
    const {
        id,
        name,
        password,
        position
    } = req.body;
    const tuple = {
        ADMIN_ID: id,
        ANAME: name,
        PASSWORD: password,
        POSITION: position
    }

    if (id.length > 0 && name.length > 0 && password.length > 0 && position.length > 0) {
        db.query(`SELECT * FROM admin WHERE ADMIN_ID='${id}'`, (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
                req.flash('error', "Admin id aldready exists")
                res.redirect("/admin", )
            } else if (results.length == 0) {
                let sql = "INSERT INTO admin SET ?";
                db.query(sql, tuple, (err, result) => {
                    if (err) throw err;
                    console.log(result);
                    req.flash('success', "Admin is successfully registered")
                    res.redirect("/admin");
                })
            }
        })

    } else {
        req.flash('error', "Please fill all details");
        res.redirect("/admin");
    }
})

// FLAT ADMIN
app.get("/admin/flat", isAuth, (req, res) => {
    let sql = "SELECT * FROM flat";
    let query = db.query(sql, (err, results) => {
        if (err) throw err;
        res.render("flat", {
            flatResults: results
        });
    });
});

app.post("/admin/flat", (req, res) => {
    console.log(req.body);
    const {
        fno,
        rooms,
        area,
        avail
    } = req.body;
    const attr = {
        fno: fno,
        rooms: rooms,
        area: area,
        avail: avail
    };
    if (fno) {
        sql = `SELECT * FROM flat WHERE FNO='${fno}'`;
    } else if (rooms) {
        sql = `SELECT * FROM flat WHERE NO_OF_ROOMS='${rooms}'`;
    } else if (area) {
        sql = `SELECT * FROM flat WHERE AREA='${area}'`;
    } else if (avail) {
        sql = `SELECT * FROM flat WHERE AVAILABLITY='${avail}'`;
    }
    db.query(sql, (err, results) => {
        if (err) throw err;
        console.log(results);
        res.render("flat", {
            flatResults: results
        })
    })
})
// RESIDENT
app.get("/admin/resident", isAuth, (req, res) => {
    let sql = "SELECT A.*,C.ANAME FROM resident A,provided_by B,admin C WHERE A.FNO=B.FNO AND B.ADMIN_ID=C.ADMIN_ID";
    let query = db.query(sql, (err, results) => {
        if (err) throw err;
        console.log(results);
        db.query("SELECT * FROM provided_by")
        res.render("resident", {
            residentResults: results,
            errorMsg: req.flash('error'),
            successMsg: req.flash('success'),
            searchError: req.flash('searchError')
        });
    });

});

app.post("/admin/resident", (req, res) => {

    let sql = `SELECT A.*,C.ANAME FROM resident A,provided_by B,admin C WHERE A.FNO=${req.body.fno} AND A.FNO=B.FNO AND B.ADMIN_ID=C.ADMIN_ID`;
    db.query(sql, (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            console.log(results);
            res.render("resident", {
                residentResults: results,
                errorMsg: req.flash('error'),
                successMsg: req.flash('success'),
            })
        } else {
            res.render("resident", {
                residentResults: results,
                errorMsg: req.flash('error'),
                successMsg: req.flash('success'),
            })
        }

    })
});

// ADD TO RESIDENT
app.post("/admin/resident/add", (req, res) => {
    const flatNo = req.body.flatNo;
    const name = req.body.name;
    const phone = req.body.phone;
    const aid = req.body.adminId;
    const tuple = {
        FNO: flatNo,
        NAME: name,
        PHONE: phone
    };
    const post = {
        FNO: flatNo,
        ADMIN_ID: aid
    }
    if (flatNo.length > 0 && name.length > 0 && phone.length > 0) {
        db.query(`SELECT * FROM resident WHERE FNO=${flatNo}`, (err, results) => {
            if (results.length > 0) {
                req.flash('error', "Flat number aldready exists");
                res.redirect("/admin/resident");
            } else if (results.length == 0) {
                // db.query(`SELECT * FROM admin WHERE ADMIN_ID=${aid}`, (err, results) => {
                //     console.log(err);
                //     console.log(results);
                //     if(err)
                //     {
                //         req.flash('error', "Please enter a valid Admin ID");
                //         res.redirect("/admin/resident");
                //     }
                //     else if (results) {
                let sql = "INSERT INTO resident SET ?";
                let query = db.query(sql, tuple, (err, result) => {

                    if (err) {
                        req.flash('error', "Please enter a valid flat number");
                        res.redirect("/admin/resident");
                    } else {
                        console.log(result);
                        db.query("INSERT INTO provided_by SET ?", post, (err, result) => {
                            if (err) {
                                console.log(err);
                                req.flash('error', "Please enter a valid Admin");
                                res.redirect("/admin/resident");
                                process.exit();
                            }
                            console.log(result);

                        })
                        req.flash('success', "New resident added successfully.")
                        res.redirect("/admin/resident")
                    }

                })
            }
        })
    } else {
        req.flash('error', "Please fill all the fields");
        res.redirect("/admin/resident");
    }
});

// DELETE FROM RESIDENT
app.post("/admin/resident/delete", (req, res) => {
    const flatNo = req.body.flatNo;
    let sql = `DELETE FROM resident WHERE FNO="${flatNo}"`
    db.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);

        res.redirect("/admin/resident")
    })
});

// VISITOR
app.get("/admin/visitor", isAuth, (req, res) => {
    let sql = "SELECT * FROM visitor";
    db.query(sql, (err, results) => {
        if (err) throw err;
        console.log(results);
        res.render("visitor", {
            visitorDetails: results
        });
    })
});

app.post("/admin/visitor", (req, res) => {
    const {
        name,
        fno,
        dt
    } = req.body;
    if (name) {
        sql = `SELECT * FROM VISITOR WHERE NAME='${name}'`;
    } else if (fno) {
        sql = `SELECT * FROM VISITOR WHERE FNO='${fno}'`;
    }


    db.query(sql, (err, results) => {
        if (err) throw err;
        console.log(results);
        res.render("visitor", {
            visitorDetails: results
        });
    })
})
// ENQUIRY
app.get("/admin/enquiry", isAuth, (req, res) => {
    console.log(req.body);
    let sql = "SELECT * FROM customer_visit"
    db.query(sql, (err, results) => {
        if (err) console.log(results);;
        console.log(results);

        res.render("enquries", {
            enq: results,
            errorMark: req.flash('errorMark')
        })
    })
});

app.post("/admin/enquiry/", (req, res) => {
    console.log(req.body);
    const name = req.body.name;
    const phone = req.body.phone;
    if (name) {
        let sql = `SELECT A.*,B.FNO FROM customer A LEFT JOIN visited_by B ON A.C_ID=B.C_ID WHERE A.CNAME="${name}"`;
        db.query(sql, (err, results) => {
            if (err) throw err;
            console.log(results);
            res.render("enquries", {
                enq: results,
                errorMark: req.flash('errorMark')
            })
        })
    } else if (phone) {
        let sql = `SELECT A.*,B.FNO FROM customer A LEFT JOIN visited_by B ON A.C_ID=B.C_ID WHERE A.CPHONE="${phone}"`;
        db.query(sql, (err, results) => {
            if (err) throw err;
            console.log(results);
            res.render("enquries", {
                enq: results,
                errorMark: req.flash('errorMark')
            })
        })
    }
});

app.post("/admin/enquiry/mark", (req, res) => {
    const {
        cid,
        fno
    } = req.body;
    const post = {
        C_ID: cid,
        FNO: fno
    };
    let sql = "INSERT INTO visited_by SET ?"
    db.query(sql, post, (err, result) => {
        if (err) {
            console.log(err);
            req.flash('errorMark', 'Error !!!, Enter valid Flat Number');
            res.redirect("/admin/enquiry");
        } else {
            console.log(result);
            res.redirect("/admin/enquiry");
        }
    })
})

//VISITOR LOGS
app.post("/visitor", (req, res) => {
    const name = req.body.name;
    const flatNo = req.body.flatNo;
    if (name.length == 0) {
        req.flash('visMsg', 'Please enter your name and flat number');
        res.redirect("/");
    } else {
        db.query("SELECT * FROM flat WHERE FNO=?",
            flatNo,
            (err, result) => {
                if (err) throw err;
                console.log(result);

                if (result.length > 0) {

                    let post = {
                        NAME: name,
                        FNO: flatNo,
                        DATE_TIME: currentDt
                    };
                    let sql = "INSERT INTO visitor SET ?"
                    let query = db.query(sql, post, (err, result) => {
                        if (err) throw err;
                        console.log(result);
                        req.flash('logged', 'Your entry is successfully logged')
                        res.redirect("/")
                    });
                } else {

                    req.flash('visMsg', 'Please enter a valid Flat Number');
                    res.redirect("/");
                }
            })
    }
});

// PORT LISTEN
app.listen("3000", () => {
    console.log("Server started at port 3000");
});

// FOREIGN KEY (FNO) REFERENCES flat(FNO) ON DELETE CASCADE


// db.query("UPDATE flat SET AVAILABLITY='SOLD' WHERE EXISTS (SELECT FNO FROM resident WHERE flat.FNO=resident.FNO)",
//     (err, results) => {
//         if (err) {
//             console.log(err);
//             res.sendStatus(500)
//         }
//         console.log(results);
//     }
// )

// db.query("UPDATE flat SET AVAILABLITY='UNSOLD' WHERE NOT EXISTS (SELECT FNO FROM resident WHERE flat.FNO=resident.FNO)",
//     (err, results) => {
//         if (err) throw err;
//         console.log(results);
//     }
// )