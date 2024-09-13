const express = require('express');
const app =express();

const PORT = 3000

app.use(express.json());
// app.use(cookieParser());
// app.use(
// 	cors({
// 		origin:"http://localhost:3000/",

// 		// origin:"http://localhost:3000",
// 		credentials:true,
// 	})
// )
// app.use(
// 	fileUpload({
// 		useTempFiles:true,
// 		tempFileDir:"/tmp",
// 	})
// )

app.get("/", (req, res) => {
	return res.json({
		success:true,
		message:'Your server is up and running....'
	});
});

app.listen(PORT, () => {
	console.log(`App is running at ${PORT}`)
})