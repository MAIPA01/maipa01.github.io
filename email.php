<?php
if(!isset($_POST['submit']))
{
	//This page should not be accessed directly. Need to submit the form.
	echo "error; you need to submit the form!";
}
$name = $_POST['name'];
$visitor_email = $_POST['email'];
$message = $_POST['message'];

//Validate
if(empty($name)||empty($visitor_email)){
    echo "Name and email are mandatory!";
    exit;
}

if(IsInjected($visitor_email))
{
    echo "Bad email value!";
    exit;
}


$email_from = 'bok.mcaipda@gmail.com';
$email_subject = "MAIPA.INC Page Customer Mail";
$email_body = "You have received a new message from the user $name.\n".
"email adress: $visitor_email\n".
"Here is the message:\n $message".;
    
    
$to = "bok.mcaipda@gmail.com";
$headers = "From: $email_from \r\n";
$headers .= "Reply-To: $visitor_email \r\n";
//Send mail
mail($to,$email_subject,$email_body,$headers);
//redicting
header('Location: index.html');

function IsInjected($str)
{
    $injections = array('(\n+)',
           '(\r+)',
           '(\t+)',
           '(%0A+)',
           '(%0D+)',
           '(%08+)',
           '(%09+)'
           );
    
    $inject = join('|', $injections);
    $inject = "/$inject/i";
    
    if(preg_match($inject,$str))
    {
      return true;
    }
    else
    {
      return false;
    }
}
?>