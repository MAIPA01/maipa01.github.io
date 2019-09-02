<?php
	if(isset($_GET['get']))
	{
		$clicks = @file_get_contents('./licznik.txt');
		@file_put_contents('./licznik.txt', $clicks+1, LOCK_EX);
 
		echo $clicks.' Download(s)';
	}
	
	if(isset($_GET['ge']))
	{
		$clicks = @file_get_contents('./licznik.txt');
		@file_put_contents('./licznik.txt', $clicks, LOCK_EX);
 
		echo $clicks.' Download(s)';
	}
?>