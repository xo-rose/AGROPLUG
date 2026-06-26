<?php
include "db.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $fullname = $_POST["fullname"];
    $email = $_POST["email"];
    $phone = $_POST["phone"];
    $password = password_hash($_POST["password"], PASSWORD_DEFAULT);

    try {

        // CHECK IF EMAIL EXISTS
        $check = "SELECT * FROM farmers WHERE email = ?";
        $stmt = $pdo->prepare($check);
        $stmt->execute([$email]);

        if ($stmt->rowCount() > 0) {
            // EMAIL EXISTS PAGE
            ?>
            <!DOCTYPE html>
            <html>
            <head>
                <title>Email Exists</title>
                <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
            </head>
            <body class="bg-gray-100 flex items-center justify-center min-h-screen">

                <div class="bg-white shadow-2xl rounded-3xl p-10 text-center">
                    <h1 class="text-2xl font-bold text-red-600">Email Already Exists</h1>
                    <p class="mt-3">Please choose another email.</p>
                    <a href="SignUp.html" class="mt-5 inline-block bg-purple-900 text-white px-6 py-2 rounded-lg">
                        Go Back
                    </a>
                </div>

            </body>
            </html>
            <?php
            exit();
        }

        // INSERT USER
        $sql = "INSERT INTO farmers (fullname, email, phone, password)
                VALUES (?, ?, ?, ?)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$fullname, $email, $phone, $password]);

        // SUCCESS PAGE
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>Success</title>
            <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        </head>
        <body class="bg-gray-100 flex items-center justify-center min-h-screen">

            <div class="bg-white shadow-2xl rounded-3xl p-10 text-center">
                <h1 class="text-2xl font-bold text-green-600">Registration Successful</h1>
                <p class="mt-3">Your account has been created.</p>
                <a href="login.php" class="mt-5 inline-block bg-purple-900 text-white px-6 py-2 rounded-lg">
                    Go to Login
                </a>
            </div>

        </body>
        </html>
        <?php

    } catch (PDOException $e) {
        echo "Database Error: " . $e->getMessage();
    }
}
?>